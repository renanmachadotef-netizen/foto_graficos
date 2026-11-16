"use client";

export function BotaoImprimir() {
  return (
    <button onClick={() => window.print()} className="print:hidden w-full h-11 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 cursor-pointer">
      Imprimir recibo
    </button>
  );
}
