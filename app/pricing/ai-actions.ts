"use server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function askPricingAI(userPrompt: string) {
  const materials = await prisma.material.findMany();
  const machines = await prisma.machine.findMany();
  const employees = await prisma.employee.findMany();

  const rawApiKey = process.env.GEMINI_API_KEY;
  const apiKey = rawApiKey ? rawApiKey.replace(/['"]/g, '').trim() : null;

  if (!apiKey) {
    // FALLBACK SIMULADO
    const isBanner = userPrompt.toLowerCase().includes("faixa") || userPrompt.toLowerCase().includes("lona");
    const isSticker = userPrompt.toLowerCase().includes("adesivo");
    
    const mat = isSticker 
      ? materials.find(m => m.name.toLowerCase().includes("adesivo")) 
      : materials.find(m => m.name.toLowerCase().includes("lona")) || materials[0];
      
    const mac = machines.find(m => m.name.toLowerCase().includes("impressora")) || machines[0];
    const emp = employees[0];

    return {
      status: "mock",
      message: "API Key não configurada. Esta é uma simulação. Adicione GEMINI_API_KEY no .env.",
      data: {
        productName: isBanner ? "Faixa em Lona" : isSticker ? "Adesivo Impresso" : "Produto Personalizado",
        targetQty: 1,
        usedMaterials: mat ? [{ materialId: mat.id, usagePerUnit: 2 }] : [],
        workflow: [
          ...(emp ? [{ id: Date.now().toString(), type: "employee", resourceId: emp.id, setupTimeMin: 15, unitTimeMin: 5 }] : []),
          ...(mac ? [{ id: (Date.now()+1).toString(), type: "machine", resourceId: mac.id, setupTimeMin: 5, unitTimeMin: 10 }] : [])
        ]
      }
    };
  }

  // CHAMADA REAL PARA A IA DO GEMINI
  const systemPrompt = `
    Você é um assistente de orçamentos para uma gráfica de comunicação visual.
    O usuário vai pedir um produto (ex: '100 faixas de lona 2x1 com ilhós').
    Você deve mapear esse pedido para o banco de dados.
    
    MATERIAIS DISPONÍVEIS:
    ${JSON.stringify(materials.map(m => ({ id: m.id, name: m.name, unit: m.unit })))}
    
    MÁQUINAS DISPONÍVEIS:
    ${JSON.stringify(machines.map(m => ({ id: m.id, name: m.name })))}
    
    FUNCIONÁRIOS DISPONÍVEIS:
    ${JSON.stringify(employees.map(e => ({ id: e.id, name: e.name })))}

    Retorne APENAS um JSON válido seguindo EXATAMENTE este formato:
    {
      "productName": "Nome do produto",
      "targetQty": 1,
      "usedMaterials": [
         { "materialId": "id", "usagePerUnit": 1.5 }
      ],
      "workflow": [
         { "type": "employee", "resourceId": "id", "setupTimeMin": 10, "unitTimeMin": 2 }
      ]
    }
  `;

  try {
    // 1. Consulta dinamicamente quais modelos essa API Key tem acesso
    const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!modelsRes.ok) throw new Error("Chave de API inválida ou sem permissão de leitura de modelos.");
    
    const modelsData = await modelsRes.json();
    const validModels = modelsData.models?.filter((m: any) => m.supportedGenerationMethods?.includes("generateContent")) || [];
    
    if (validModels.length === 0) throw new Error("Nenhum modelo de geração de texto disponível para esta chave.");

    // Prioriza modelos 'flash' (mais rápidos), depois 'pro', ou pega o primeiro da lista
    const flashModel = validModels.find((m: any) => m.name.includes("flash"));
    const proModel = validModels.find((m: any) => m.name.includes("pro"));
    const selectedModelName = flashModel ? flashModel.name : (proModel ? proModel.name : validModels[0].name);

    // 2. Monta o payload
    const payload = {
      contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n--- PEDIDO DO CLIENTE ---\n" + userPrompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
    };

    // 3. Chama o modelo exato que a conta suporta
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${selectedModelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha no modelo ${selectedModelName} (${response.status}): ${errorText.substring(0, 100)}`);
    }
    
    const data = await response.json();
    const rawContent = data.candidates[0].content.parts[0].text;
    
    // Limpar o JSON caso a IA retorne com markdown
    const cleanedContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    const resultJson = JSON.parse(cleanedContent);

    return {
      status: "success",
      message: `Orçamento montado via ${selectedModelName.replace('models/','')}!`,
      data: resultJson
    };
  } catch (err: any) {
    return {
      status: "error",
      message: err.message || "Erro desconhecido ao consultar a IA."
    };
  }
}
