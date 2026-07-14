export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white shadow-2xl rounded-2xl p-10 w-full max-w-2xl text-center">

        <h1 className="text-5xl font-bold text-blue-900">
          MattFinance ERP
        </h1>

        <p className="mt-4 text-gray-600 text-xl">
          Sistema Inteligente de Gestión Financiera
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4">

          <div className="bg-blue-100 rounded-xl p-5">
            💰
            <h2 className="font-bold mt-2">Préstamos</h2>
          </div>

          <div className="bg-green-100 rounded-xl p-5">
            💱
            <h2 className="font-bold mt-2">Cambio de Divisas</h2>
          </div>

          <div className="bg-yellow-100 rounded-xl p-5">
            💳
            <h2 className="font-bold mt-2">Tarjetas</h2>
          </div>

          <div className="bg-red-100 rounded-xl p-5">
            📊
            <h2 className="font-bold mt-2">Flujo de Caja</h2>
          </div>

        </div>

        <button className="mt-10 bg-blue-900 text-white px-8 py-3 rounded-xl hover:bg-blue-800 transition">
          Entrar al sistema
        </button>

      </div>
    </main>
  );
}