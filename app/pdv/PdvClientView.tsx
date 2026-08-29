"use client";

import { useState } from "react";
import { createPosSaleAction, createProductAction, PosCartItem } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  Share2,
  DollarSign,
  QrCode,
  CreditCard,
  Banknote,
  Search,
  Calculator,
  PlusCircle,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  FileText,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number;
  unit: string;
  description: string | null;
}

interface Material {
  id: string;
  name: string;
  unitCost: number;
  unit: string;
  width?: number | null;
}

interface Client {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface PdvClientViewProps {
  initialProducts: Product[];
  materials: Material[];
  clients: Client[];
  companySettings: any;
  userName: string;
}

export function PdvClientView({
  initialProducts,
  materials,
  clients,
  companySettings,
  userName,
}: PdvClientViewProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Cart State
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("balcao");
  const [customClientName, setCustomClientName] = useState<string>("");
  const [customClientPhone, setCustomClientPhone] = useState<string>("");
  const [discount, setDiscount] = useState<string>("0");
  
  // Modals
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isM2ModalOpen, setIsM2ModalOpen] = useState(false);
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  
  // Checkout Form State
  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CARD_CREDIT" | "CARD_DEBIT" | "CASH" | "TRANSFER">("PIX");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [sendToPcp, setSendToPcp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastSaleResult, setLastSaleResult] = useState<any>(null);

  // M2 Calculator State
  const [m2Material, setM2Material] = useState<string>(materials[0]?.name || "Lona Frontlight 440g");
  const [m2Width, setM2Width] = useState<string>("1.0");
  const [m2Height, setM2Height] = useState<string>("1.0");
  const [m2UnitPrice, setM2UnitPrice] = useState<string>("65.00");
  const [m2Quantity, setM2Quantity] = useState<string>("1");
  const [m2Finish, setM2Finish] = useState<string>("Bastão e Corda");

  // Custom Item State
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customQty, setCustomQty] = useState("1");

  // Add Preset Product to Cart
  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.name === product.name && !item.notes);
      if (existing) {
        return prev.map((item) =>
          item.name === product.name && !item.notes
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          name: product.name,
          quantity: 1,
          unitPrice: product.price,
          unitCost: product.cost,
          unit: product.unit,
        },
      ];
    });
  }

  function updateItemQty(index: number, delta: number) {
    setCart((prev) =>
      prev
        .map((item, i) => {
          if (i === index) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosCartItem[]
    );
  }

  function removeItem(index: number) {
    setCart((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddM2Item(e: React.FormEvent) {
    e.preventDefault();
    const w = parseFloat(m2Width.replace(",", ".")) || 1;
    const h = parseFloat(m2Height.replace(",", ".")) || 1;
    const area = w * h;
    const pricePerM2 = parseFloat(m2UnitPrice.replace(",", ".")) || 65;
    const qty = parseInt(m2Quantity) || 1;
    const itemUnitPrice = area * pricePerM2;

    const itemName = `${m2Material} (${w.toFixed(2)}x${h.toFixed(2)}m - ${area.toFixed(2)}m²)`;

    setCart((prev) => [
      ...prev,
      {
        name: itemName,
        quantity: qty,
        unitPrice: itemUnitPrice,
        unitCost: itemUnitPrice * 0.4,
        unit: "un",
        notes: `Acabamento: ${m2Finish}`,
      },
    ]);

    setIsM2ModalOpen(false);
  }

  function handleAddCustomItem(e: React.FormEvent) {
    e.preventDefault();
    if (!customName || !customPrice) return;

    setCart((prev) => [
      ...prev,
      {
        name: customName,
        quantity: parseInt(customQty) || 1,
        unitPrice: parseFloat(customPrice.replace(",", ".")) || 0,
        unitCost: (parseFloat(customPrice.replace(",", ".")) || 0) * 0.4,
        unit: "un",
      },
    ]);

    setCustomName("");
    setCustomPrice("");
    setCustomQty("1");
    setIsCustomItemOpen(false);
  }

  // Cart Calculations
  const subtotal = cart.reduce((acc, it) => acc + it.unitPrice * it.quantity, 0);
  const discountVal = parseFloat(discount.replace(",", ".")) || 0;
  const total = Math.max(0, subtotal - discountVal);

  const amountPaidNum = parseFloat(amountPaidInput.replace(",", ".")) || total;
  const change = paymentMethod === "CASH" && amountPaidNum > total ? amountPaidNum - total : 0;

  async function handleFinalizeSale() {
    setLoading(true);

    const clientObj = clients.find((c) => c.id === selectedClientId);

    const res = await createPosSaleAction({
      clientId: selectedClientId,
      clientName: selectedClientId === "balcao" ? customClientName || "Cliente Balcão" : clientObj?.name,
      clientPhone: selectedClientId === "balcao" ? customClientPhone : clientObj?.phone || "",
      items: cart,
      discount: discountVal,
      paymentMethod,
      amountPaid: isPartialPayment ? amountPaidNum : total,
      isPartialPayment,
      sendToPcp,
    });

    setLoading(false);

    if (res?.error) {
      alert(res.error);
    } else {
      setLastSaleResult(res);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      setCart([]);
      setDiscount("0");
      setAmountPaidInput("");
    }
  }

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const categories = [
    { id: "ALL", label: "Todos os Itens" },
    { id: "BALCAO", label: "Gráfica Rápida" },
    { id: "IMPRESSAO", label: "Banners & Lonas" },
    { id: "FOTOS", label: "Fotos & Estúdio" },
    { id: "ACABAMENTO", label: "Acabamentos" },
    { id: "BRINDES", label: "Brindes & Crachás" },
  ];

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Top Bar: Title + Fast Action Shortcuts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-indigo-600" />
            PDV Balcão Rápido
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Frente de caixa ágil • Vendas express, cálculo por m² e recibo no WhatsApp
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsM2ModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs gap-1.5"
          >
            <Calculator className="w-4 h-4" />
            Calcular por m²
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCustomItemOpen(true)}
            className="text-xs font-semibold gap-1.5 text-slate-700 hover:text-indigo-600"
          >
            <PlusCircle className="w-4 h-4" />
            Item Avulso
          </Button>
        </div>
      </div>

      {/* Main POS Layout: Products on Left (7 cols) + Cart on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Product Catalog & Fast Grid */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Search & Category Tabs */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Buscar produto, lona, foto, adesivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white text-sm border-slate-200 shadow-xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((prod) => (
              <button
                key={prod.id}
                onClick={() => addToCart(prod)}
                className="p-3.5 bg-white border border-slate-200 hover:border-indigo-500 rounded-xl text-left transition-all duration-150 hover:shadow-md hover:scale-[1.02] flex flex-col justify-between h-32 group cursor-pointer"
              >
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">
                    {prod.name}
                  </h3>
                  {prod.description && (
                    <p className="text-[10px] text-slate-400 line-clamp-1 mt-1">
                      {prod.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100 mt-auto">
                  <span className="font-extrabold text-sm text-emerald-600">
                    R$ {prod.price.toFixed(2)}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    /{prod.unit}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
              Nenhum produto encontrado nessa categoria.
            </div>
          )}
        </div>

        {/* Right Side: Cart / Comanda (5 cols) */}
        <div className="lg:col-span-5">
          <Card className="border-slate-200 bg-white shadow-md sticky top-16">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-indigo-600" />
                  Comanda / Carrinho
                </CardTitle>
                <Badge variant="outline" className="text-xs font-bold text-slate-600">
                  {cart.reduce((a, b) => a + b.quantity, 0)} {cart.reduce((a, b) => a + b.quantity, 0) === 1 ? "item" : "itens"}
                </Badge>
              </div>

              {/* Client Selection */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg p-2 text-slate-800 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="balcao">👤 Cliente Balcão (Rápido)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClientId === "balcao" && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Input
                      placeholder="Nome do cliente (opcional)"
                      value={customClientName}
                      onChange={(e) => setCustomClientName(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                    <Input
                      placeholder="WhatsApp (ex: 11999998888)"
                      value={customClientPhone}
                      onChange={(e) => setCustomClientPhone(e.target.value)}
                      className="text-xs h-8 bg-white"
                    />
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              {/* Cart Items List */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    O carrinho está vazio.<br />Clique nos produtos ao lado para adicionar.
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div className="max-w-[170px] sm:max-w-[200px]">
                        <p className="font-bold text-slate-900 leading-tight">{item.name}</p>
                        {item.notes && <p className="text-[10px] text-slate-500">{item.notes}</p>}
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          R$ {item.unitPrice.toFixed(2)} cada
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Qty Controls */}
                        <div className="flex items-center border border-slate-200 rounded-md bg-white">
                          <button
                            type="button"
                            onClick={() => updateItemQty(idx, -1)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded-l"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2 font-bold text-slate-800 text-xs">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQty(idx, 1)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded-r"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Item Subtotal */}
                        <span className="font-extrabold text-slate-900 min-w-[55px] text-right">
                          R$ {(item.quantity * item.unitPrice).toFixed(2)}
                        </span>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals & Discounts */}
              {cart.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-bold">R$ {subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-slate-600 whitespace-nowrap">Desconto (R$):</span>
                    <Input
                      type="number"
                      step="0.50"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-24 h-7 text-xs text-right font-bold text-rose-600 bg-white"
                      placeholder="0,00"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <span className="font-extrabold text-indigo-950 text-sm">Total a Pagar:</span>
                    <span className="font-extrabold text-xl text-indigo-600">
                      R$ {total.toFixed(2)}
                    </span>
                  </div>

                  <Button
                    onClick={() => {
                      setAmountPaidInput(total.toString());
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm py-3 rounded-xl shadow-lg shadow-emerald-600/20"
                  >
                    Finalizar Venda (F2) →
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Modal 1: Checkout & Payment */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Fechar Venda & Pagamento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Valor Total da Venda: <strong className="text-emerald-600 text-sm">R$ {total.toFixed(2)}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Forma de Pagamento</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "PIX", label: "PIX", icon: QrCode, color: "text-teal-600" },
                  { id: "CARD_CREDIT", label: "Crédito", icon: CreditCard, color: "text-indigo-600" },
                  { id: "CARD_DEBIT", label: "Débito", icon: CreditCard, color: "text-blue-600" },
                  { id: "CASH", label: "Dinheiro", icon: Banknote, color: "text-emerald-600" },
                  { id: "TRANSFER", label: "A Prazo", icon: FileText, color: "text-amber-600" },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentMethod(item.id as any)}
                      className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${item.color}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PIX Key Banner */}
            {paymentMethod === "PIX" && companySettings?.pixKey && (
              <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs">
                <p className="font-bold flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-teal-600" /> Chave PIX da Empresa:
                </p>
                <p className="font-mono text-xs mt-1 bg-white p-1.5 rounded border border-teal-100 select-all">
                  {companySettings.pixKey}
                </p>
              </div>
            )}

            {/* Cash Troco Calculator */}
            {paymentMethod === "CASH" && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-emerald-950">Valor Entregue</Label>
                  <Input
                    type="number"
                    step="1.00"
                    placeholder="Ex: 50.00"
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    className="bg-white border-emerald-300 font-bold text-emerald-700 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-emerald-950">Troco a Devolver</Label>
                  <div className="h-9 px-3 flex items-center font-extrabold text-base text-emerald-700 bg-white rounded-md border border-emerald-200">
                    R$ {change.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Partial Down Payment / Sinal */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={isPartialPayment}
                  onChange={(e) => setIsPartialPayment(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Pagamento Parcial (Sinal de Entrada + Saldo na Entrega)</span>
              </label>

              {isPartialPayment && (
                <div className="grid grid-cols-2 gap-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                  <div>
                    <Label className="text-amber-900 font-bold">Valor Pago Agora (Sinal)</Label>
                    <Input
                      type="number"
                      step="1.00"
                      value={amountPaidInput}
                      onChange={(e) => setAmountPaidInput(e.target.value)}
                      className="bg-white border-amber-300 font-bold text-amber-900"
                    />
                  </div>
                  <div>
                    <Label className="text-amber-900 font-bold">Saldo na Retirada</Label>
                    <div className="h-9 px-2 flex items-center font-bold text-amber-900 bg-white rounded border border-amber-200">
                      R$ {Math.max(0, total - (parseFloat(amountPaidInput) || 0)).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Send to PCP Toggle */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 pt-1">
              <input
                type="checkbox"
                checked={sendToPcp}
                onChange={(e) => setSendToPcp(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Enviar automaticamente para Fila de Produção (PCP)</span>
            </label>

            <div className="flex justify-end gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setIsCheckoutOpen(false)}>
                Voltar
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={handleFinalizeSale}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {loading ? "Processando..." : "Confirmar & Emitir Recibo"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Receipt & WhatsApp Share */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-slate-900 flex items-center justify-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Venda Concluída com Sucesso!
            </DialogTitle>
          </DialogHeader>

          {lastSaleResult && (
            <div className="space-y-4 pt-2">
              {/* Thermal Receipt Visual */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 space-y-2 shadow-inner">
                <div className="text-center border-b border-dashed border-slate-300 pb-2">
                  <p className="font-bold text-sm">{companySettings?.companyName || "FOTO & GRÁFICOS"}</p>
                  <p className="text-[10px] text-slate-500">CUPOM DE VENDA BALCÃO</p>
                  <p className="text-[10px] font-bold mt-1">PEDIDO #{lastSaleResult.saleNumber}</p>
                </div>

                <div className="border-b border-dashed border-slate-300 py-2 space-y-1">
                  <p><strong>Cliente:</strong> {lastSaleResult.clientName}</p>
                  <p><strong>Atendente:</strong> {userName}</p>
                  <p><strong>Data:</strong> {new Date().toLocaleDateString("pt-BR")} {new Date().toLocaleTimeString("pt-BR")}</p>
                </div>

                <div className="border-b border-dashed border-slate-300 py-2 space-y-1">
                  {lastSaleResult.items.map((it: any, i: number) => (
                    <div key={i} className="flex justify-between">
                      <span>{it.quantity}x {it.name.slice(0, 20)}</span>
                      <span>R$ {(it.quantity * it.unitPrice).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 space-y-1 font-bold">
                  <div className="flex justify-between text-sm">
                    <span>TOTAL:</span>
                    <span>R$ {lastSaleResult.finalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>PAGO ({lastSaleResult.paymentMethod}):</span>
                    <span>R$ {lastSaleResult.amountPaid.toFixed(2)}</span>
                  </div>
                  {lastSaleResult.change > 0 && (
                    <div className="flex justify-between text-[11px] text-emerald-600">
                      <span>TROCO:</span>
                      <span>R$ {lastSaleResult.change.toFixed(2)}</span>
                    </div>
                  )}
                  {lastSaleResult.remaining > 0 && (
                    <div className="flex justify-between text-[11px] text-amber-600">
                      <span>A PAGAR NA RETIRADA:</span>
                      <span>R$ {lastSaleResult.remaining.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {lastSaleResult.whatsappUrl && (
                  <a
                    href={lastSaleResult.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Enviar Comprovante no WhatsApp
                  </a>
                )}

                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  className="w-full text-xs font-bold gap-2 text-slate-700"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Comprovante
                </Button>

                <Button
                  onClick={() => setIsReceiptOpen(false)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  Nova Venda
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal 3: Calculadora de m² Rápida */}
      <Dialog open={isM2ModalOpen} onOpenChange={setIsM2ModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-indigo-600" />
              Calculadora Rápida por m²
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Digite a largura e altura para calcular a área e o valor na hora.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddM2Item} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Material / Mídia</Label>
              <select
                value={m2Material}
                onChange={(e) => setM2Material(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white"
              >
                <option value="Lona Frontlight 440g">Lona Frontlight 440g</option>
                <option value="Lona Blackout 510g">Lona Blackout 510g</option>
                <option value="Adesivo Vinil Brilho">Adesivo Vinil Brilho</option>
                <option value="Adesivo Vinil Fosco">Adesivo Vinil Fosco</option>
                <option value="Adesivo Perfurado">Adesivo Perfurado</option>
                <option value="Tecido Canvas">Tecido Canvas</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Largura (metros)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={m2Width}
                  onChange={(e) => setM2Width(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Altura (metros)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={m2Height}
                  onChange={(e) => setM2Height(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Preço do m² (R$)</Label>
                <Input
                  type="number"
                  step="1.00"
                  required
                  value={m2UnitPrice}
                  onChange={(e) => setM2UnitPrice(e.target.value)}
                  className="text-xs font-bold text-emerald-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={m2Quantity}
                  onChange={(e) => setM2Quantity(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Acabamento</Label>
              <select
                value={m2Finish}
                onChange={(e) => setM2Finish(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white"
              >
                <option value="Bastão e Cordinha">Bastão e Cordinha</option>
                <option value="Ilhoses em toda a volta">Ilhoses em toda a volta</option>
                <option value="Refile Reto (Sem acabamento)">Refile Reto (Sem acabamento)</option>
                <option value="Bainha para solda">Bainha para solda</option>
                <option value="Máscara de Transferência">Máscara de Transferência</option>
              </select>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
              <span className="text-slate-600">
                Área Total: <strong>{((parseFloat(m2Width) || 0) * (parseFloat(m2Height) || 0)).toFixed(2)} m²</strong>
              </span>
              <span className="font-extrabold text-sm text-indigo-600">
                Total: R$ {(
                  (parseFloat(m2Width) || 0) *
                  (parseFloat(m2Height) || 0) *
                  (parseFloat(m2UnitPrice) || 0) *
                  (parseInt(m2Quantity) || 1)
                ).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsM2ModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Adicionar ao Carrinho
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 4: Item Avulso */}
      <Dialog open={isCustomItemOpen} onOpenChange={setIsCustomItemOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Adicionar Item Avulso</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddCustomItem} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição do Serviço / Produto</Label>
              <Input
                required
                placeholder="Ex: Arte gráfica, Montagem, Ajuste de arquivo..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Valor Unitário (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="text-xs font-bold text-emerald-600"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  required
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCustomItemOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Adicionar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
