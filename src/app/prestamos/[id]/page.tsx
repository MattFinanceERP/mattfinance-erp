"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

type Cliente = {
  first_name: string;
  last_name: string;
  document_number: string;
  phone_primary: string;
};

type Moneda = {
  code: string;
  symbol: string;
};

type Prestamo = {
  id: string;
  loan_number: string;
  loan_type: string;
  principal_amount: number;
  principal_balance: number;
  interest_rate: number;
  interest_balance: number;
  late_fee_balance: number;
  interest_frequency: string;
  term_count: number;
  start_date: string;
  due_date: string | null;
  status: string;
  notes: string | null;
  clients: Cliente | null;
  currencies: Moneda | null;
};

type Pago = {
    id: string;
    payment_number: string;
    payment_date: string;
    amount: number;
    principal_amount: number;
    interest_amount: number;
    late_fee_amount: number;
    payment_method: string;
    affects_cash: boolean;
    status: string;
  };

export default function PrestamoDetallePage() {
  const params = useParams();
  const router = useRouter();

  const supabase = useMemo(function crearSupabase() {
    return createClient();
  }, []);

  const prestamoId = String(params.id || "");

  const [prestamo, setPrestamo] = useState<Prestamo | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState("");

  useEffect(
    function cargarPrestamoAlAbrir() {
      async function cargarPrestamo() {
        if (prestamoId === "") {
          setMensajeError("No se recibió el identificador del préstamo.");
          setCargando(false);
          return;
        }

        setCargando(true);
        setMensajeError("");

        const resultado = await supabase
          .from("loans")
          .select(
            "id, loan_number, loan_type, principal_amount, principal_balance, interest_rate, interest_balance, late_fee_balance, interest_frequency, term_count, start_date, due_date, status, notes, clients(first_name, last_name, document_number, phone_primary), currencies(code, symbol)",
          )
          .eq("id", prestamoId)
          .single();
          const resultadoPagos = await supabase
          .from("loan_payments")
          .select(
            "id, payment_number, payment_date, amount, principal_amount, interest_amount, late_fee_amount, payment_method, affects_cash, status",
          )
          .eq("loan_id", prestamoId)
          .order("payment_date", { ascending: false });

          if (resultado.error) {
            setMensajeError(
              "No se pudo cargar el préstamo: " +
                resultado.error.message,
            );
            setPrestamo(null);
          } else {
            setPrestamo(resultado.data as unknown as Prestamo);
          }
          
          if (resultadoPagos.error) {
            setMensajeError(
              "No se pudo cargar el historial de pagos: " +
                resultadoPagos.error.message,
            );
            setPagos([]);
          } else {
            setPagos((resultadoPagos.data || []) as Pago[]);
          }
          
          setCargando(false);
      }

      void cargarPrestamo();
    },
    [prestamoId, supabase],
  );

  function formatearMonto(monto: number) {
    const simbolo = prestamo?.currencies?.symbol || "";
  
    return (
      simbolo +
      " " +
      Number(monto).toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatearFecha(fecha: string | null) {
    if (!fecha) {
      return "—";
    }

    return new Date(fecha + "T12:00:00").toLocaleDateString(
      "es-DO",
    );
  }

  function obtenerTipo(tipo: string) {
    if (tipo === "personal") return "Personal";
    if (tipo === "card") return "Con tarjeta";
    if (tipo === "collateral") return "Con garantía";
    if (tipo === "pawn") return "Empeño";

    return tipo;
  }

  function obtenerFrecuencia(frecuencia: string) {
    if (frecuencia === "weekly") return "Semanal";
    if (frecuencia === "biweekly") return "Quincenal";
    if (frecuencia === "monthly") return "Mensual";

    return frecuencia;
  }

  function obtenerEstado(estado: string) {
    if (estado === "active") return "Activo";
    if (estado === "overdue") return "Vencido";
    if (estado === "paid") return "Pagado";
    if (estado === "draft") return "Borrador";
    if (estado === "approved") return "Aprobado";
    if (estado === "cancelled") return "Cancelado";

    return estado;
  }

  function obtenerClaseEstado(estado: string) {
    const base =
      "inline-flex rounded-full px-3 py-1 text-sm font-semibold ";

    if (estado === "active") {
      return base + "bg-green-100 text-green-800";
    }

    if (estado === "overdue") {
      return base + "bg-red-100 text-red-800";
    }

    if (estado === "paid") {
      return base + "bg-blue-100 text-blue-800";
    }

    return base + "bg-gray-100 text-gray-700";
  }

  function formatearFechaHora(fecha: string) {
    return new Date(fecha).toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }
  
  function obtenerMetodoPago(metodo: string) {
    if (metodo === "cash") return "Efectivo";
    if (metodo === "transfer") return "Transferencia";
    if (metodo === "deposit") return "Depósito";
    if (metodo === "check") return "Cheque";
    if (metodo === "card_withdrawal") return "Retiro con tarjeta";
  
    return "Otro";
  }

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <p className="text-gray-600">
          Cargando información del préstamo...
        </p>
      </main>
    );
  }

  if (!prestamo) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold text-red-700">
            No se pudo abrir el préstamo
          </h1>

          <p className="mt-3 text-gray-700">
            {mensajeError || "El préstamo no fue encontrado."}
          </p>

          <button
            type="button"
            onClick={function volver() {
              router.push("/prestamos");
            }}
            className="mt-5 rounded-lg bg-blue-900 px-5 py-3 font-medium text-white"
          >
            Volver a préstamos
          </button>
        </div>
      </main>
    );
  }

  const totalPendiente =
    Number(prestamo.principal_balance) +
    Number(prestamo.interest_balance) +
    Number(prestamo.late_fee_balance);

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={function volver() {
            router.push("/prestamos");
          }}
          className="font-medium text-blue-900 hover:underline"
        >
          ← Volver a préstamos
        </button>

        <section className="mt-4 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-blue-900">
                  {prestamo.loan_number}
                </h1>

                <span
                  className={obtenerClaseEstado(prestamo.status)}
                >
                  {obtenerEstado(prestamo.status)}
                </span>
              </div>

              <p className="mt-2 text-gray-600">
                {prestamo.clients
                  ? prestamo.clients.first_name +
                    " " +
                    prestamo.clients.last_name
                  : "Cliente no disponible"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={function registrarPago() {
                    router.push("/cobros?loanId=" + prestamo.id);
                }}
                className="rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
              >
                Registrar pago
              </button>

              <button
                type="button"
                className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
              >
                Imprimir recibo
              </button>

              <button
                type="button"
                className="rounded-lg bg-yellow-500 px-4 py-2 font-medium text-white hover:bg-yellow-600"
              >
                Editar préstamo
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">
              Capital original
            </p>

            <p className="mt-2 text-2xl font-bold text-gray-900">
              {formatearMonto(prestamo.principal_amount)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">
              Capital pendiente
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-900">
              {formatearMonto(prestamo.principal_balance)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">
              Interés pendiente
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-700">
              {formatearMonto(prestamo.interest_balance)}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow">
            <p className="text-sm text-gray-500">
              Total pendiente
            </p>

            <p className="mt-2 text-2xl font-bold text-red-700">
              {formatearMonto(totalPendiente)}
            </p>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-900">
              Datos del cliente
            </h2>

            <div className="mt-5 space-y-4">
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-gray-500">Nombre</span>

                <span className="text-right font-medium text-gray-900">
                  {prestamo.clients
                    ? prestamo.clients.first_name +
                      " " +
                      prestamo.clients.last_name
                    : "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-gray-500">Cédula</span>

                <span className="font-medium text-gray-900">
                  {prestamo.clients?.document_number || "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Teléfono</span>

                <span className="font-medium text-gray-900">
                  {prestamo.clients?.phone_primary || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-xl font-bold text-blue-900">
              Datos del préstamo
            </h2>

            <div className="mt-5 space-y-4">
              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-gray-500">Tipo</span>
                <span className="font-medium text-gray-900">
                  {obtenerTipo(prestamo.loan_type)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-gray-500">Moneda</span>
                <span className="font-medium text-gray-900">
                  {prestamo.currencies?.code || "—"}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-gray-500">
                  Tasa de interés
                </span>
                <span className="font-medium text-gray-900">
                  {prestamo.interest_rate}%
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-gray-500">Frecuencia</span>
                <span className="font-medium text-gray-900">
                  {obtenerFrecuencia(
                    prestamo.interest_frequency,
                  )}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-gray-500">Períodos</span>
                <span className="font-medium text-gray-900">
                  {prestamo.term_count}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-gray-500">
                  Fecha de inicio
                </span>
                <span className="font-medium text-gray-900">
                  {formatearFecha(prestamo.start_date)}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b pb-3">
                <span className="text-gray-500">
                  Fecha de vencimiento
                </span>
                <span className="font-medium text-gray-900">
                  {formatearFecha(prestamo.due_date)}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  Mora pendiente
                </span>
                <span className="font-bold text-red-700">
                  {formatearMonto(prestamo.late_fee_balance)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-blue-900">
            Observaciones
          </h2>

          <p className="mt-4 text-gray-700">
            {prestamo.notes || "Este préstamo no tiene observaciones."}
          </p>
        </section>
        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
  <h2 className="text-xl font-bold text-blue-900">
    Historial de pagos
  </h2>

  <div className="mt-5 overflow-x-auto">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-slate-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
            Recibo
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
            Fecha
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
            Total
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
            Capital
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
            Interés
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
            Mora
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
            Método
          </th>
          <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
            Caja
          </th>
        </tr>
      </thead>

      <tbody className="divide-y divide-gray-200">
        {pagos.length === 0 ? (
          <tr>
            <td
              colSpan={8}
              className="px-4 py-8 text-center text-gray-500"
            >
              Este préstamo todavía no tiene pagos registrados.
            </td>
          </tr>
        ) : (
          pagos.map(function mostrarPago(pago) {
            return (
              <tr key={pago.id}>
                <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-blue-900">
                  {pago.payment_number}
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                  {formatearFechaHora(pago.payment_date)}
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900">
                  {formatearMonto(pago.amount)}
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                  {formatearMonto(pago.principal_amount)}
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                  {formatearMonto(pago.interest_amount)}
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                  {formatearMonto(pago.late_fee_amount)}
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                  {obtenerMetodoPago(pago.payment_method)}
                </td>

                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                  {pago.affects_cash ? "Sí" : "No"}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
</section>
      </div>
    </main>
  );
}