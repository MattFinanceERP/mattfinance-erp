"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "../lib/supabase";

type Moneda = {
  id: string;
  code: string;
  symbol: string;
};

type MovimientoCaja = {
  id: string;
  movement_date: string;
  movement_type: string;
  direction: "income" | "expense";
  amount: number;
  reference_number: string | null;
  description: string | null;
  payment_method: string;
  status: string;
  currencies: Moneda | null;
};

type ResumenMoneda = {
  code: string;
  symbol: string;
  ingresos: number;
  egresos: number;
  balance: number;
};

export default function CajaPage() {
  const supabase = useMemo(function crearSupabase() {
    return createClient();
  }, []);

  const [movimientos, setMovimientos] =
    useState<MovimientoCaja[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mensajeError, setMensajeError] = useState("");
  const [filtroMoneda, setFiltroMoneda] = useState("all");
  const [filtroDireccion, setFiltroDireccion] = useState("all");

  const cargarMovimientos = useCallback(
    async function cargarDesdeSupabase() {
      setCargando(true);
      setMensajeError("");

      const resultado = await supabase
        .from("cash_movements")
        .select(
          "id, movement_date, movement_type, direction, amount, reference_number, description, payment_method, status, currencies(id, code, symbol)",
        )
        .eq("status", "posted")
        .order("movement_date", { ascending: false });

      if (resultado.error) {
        setMensajeError(
          "No se pudieron cargar los movimientos de caja: " +
            resultado.error.message,
        );
        setMovimientos([]);
      } else {
        setMovimientos(
          (resultado.data || []) as unknown as MovimientoCaja[],
        );
      }

      setCargando(false);
    },
    [supabase],
  );

  useEffect(
    function cargarAlAbrirPagina() {
      void cargarMovimientos();
    },
    [cargarMovimientos],
  );

  const resumenPorMoneda = useMemo(
    function calcularResumen() {
      const resumen = new Map<string, ResumenMoneda>();

      movimientos.forEach(function sumarMovimiento(movimiento) {
        const codigo = movimiento.currencies
          ? movimiento.currencies.code
          : "SIN_MONEDA";

        const simbolo = movimiento.currencies
          ? movimiento.currencies.symbol
          : "";

        const actual = resumen.get(codigo) || {
          code: codigo,
          symbol: simbolo,
          ingresos: 0,
          egresos: 0,
          balance: 0,
        };

        if (movimiento.direction === "income") {
          actual.ingresos =
            actual.ingresos + Number(movimiento.amount);
        } else {
          actual.egresos =
            actual.egresos + Number(movimiento.amount);
        }

        actual.balance = actual.ingresos - actual.egresos;

        resumen.set(codigo, actual);
      });

      return Array.from(resumen.values());
    },
    [movimientos],
  );

  const monedasDisponibles = useMemo(
    function obtenerMonedas() {
      const codigos = new Set<string>();

      movimientos.forEach(function guardarCodigo(movimiento) {
        if (movimiento.currencies) {
          codigos.add(movimiento.currencies.code);
        }
      });

      return Array.from(codigos).sort();
    },
    [movimientos],
  );

  const movimientosFiltrados = useMemo(
    function filtrarMovimientos() {
      return movimientos.filter(function coincide(movimiento) {
        const coincideMoneda =
          filtroMoneda === "all" ||
          movimiento.currencies?.code === filtroMoneda;

        const coincideDireccion =
          filtroDireccion === "all" ||
          movimiento.direction === filtroDireccion;

        return coincideMoneda && coincideDireccion;
      });
    },
    [movimientos, filtroMoneda, filtroDireccion],
  );

  function formatearMonto(
    monto: number,
    moneda: Moneda | null,
  ) {
    const simbolo = moneda ? moneda.symbol : "";

    return (
      simbolo +
      " " +
      Number(monto).toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatearMontoResumen(
    monto: number,
    simbolo: string,
  ) {
    return (
      simbolo +
      " " +
      Number(monto).toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  function formatearFecha(fecha: string) {
    return new Date(fecha).toLocaleString("es-DO", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  function obtenerTextoTipo(tipo: string) {
    if (tipo === "loan_payment") return "Cobro de préstamo";
    if (tipo === "loan_disbursement") return "Desembolso";
    if (tipo === "pawn_payment") return "Cobro de empeño";
    if (tipo === "sale") return "Venta";
    if (tipo === "expense") return "Gasto";
    if (tipo === "deposit") return "Depósito";
    if (tipo === "withdrawal") return "Retiro";
    if (tipo === "currency_exchange") {
      return "Cambio de divisas";
    }

    return "Ajuste";
  }

  function obtenerTextoMetodo(metodo: string) {
    if (metodo === "cash") return "Efectivo";
    if (metodo === "transfer") return "Transferencia";
    if (metodo === "deposit") return "Depósito";
    if (metodo === "check") return "Cheque";
    if (metodo === "card_withdrawal") {
      return "Retiro con tarjeta";
    }

    return "Otro";
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-4xl font-bold text-blue-900">
            Caja
          </h1>

          <p className="mt-2 text-gray-600">
            Consulta entradas, salidas y balances por moneda
          </p>
        </div>

        {mensajeError !== "" && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {mensajeError}
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-xl font-bold text-blue-900">
            Resumen por moneda
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cargando ? (
              <div className="rounded-xl bg-white p-6 shadow">
                <p className="text-gray-500">
                  Cargando resumen...
                </p>
              </div>
            ) : resumenPorMoneda.length === 0 ? (
              <div className="rounded-xl bg-white p-6 shadow">
                <p className="text-gray-500">
                  Todavía no hay movimientos de caja.
                </p>
              </div>
            ) : (
              resumenPorMoneda.map(function mostrarResumen(
                resumen,
              ) {
                return (
                  <div
                    key={resumen.code}
                    className="rounded-xl bg-white p-6 shadow"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-blue-900">
                        {resumen.code}
                      </h3>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-gray-700">
                        {resumen.symbol}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Entradas
                        </span>

                        <span className="font-medium text-green-700">
                          {formatearMontoResumen(
                            resumen.ingresos,
                            resumen.symbol,
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Salidas
                        </span>

                        <span className="font-medium text-red-700">
                          {formatearMontoResumen(
                            resumen.egresos,
                            resumen.symbol,
                          )}
                        </span>
                      </div>

                      <div className="border-t border-gray-200 pt-3">
                        <div className="flex justify-between">
                          <span className="font-semibold text-gray-900">
                            Balance
                          </span>

                          <span className="text-lg font-bold text-blue-900">
                            {formatearMontoResumen(
                              resumen.balance,
                              resumen.symbol,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900">
                Movimientos de caja
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Historial de entradas y salidas registradas
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                value={filtroMoneda}
                onChange={function cambiarMoneda(event) {
                  setFiltroMoneda(event.target.value);
                }}
                className="rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
              >
                <option value="all">
                  Todas las monedas
                </option>

                {monedasDisponibles.map(function mostrarMoneda(
                  codigo,
                ) {
                  return (
                    <option key={codigo} value={codigo}>
                      {codigo}
                    </option>
                  );
                })}
              </select>

              <select
                value={filtroDireccion}
                onChange={function cambiarDireccion(event) {
                  setFiltroDireccion(event.target.value);
                }}
                className="rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
              >
                <option value="all">
                  Entradas y salidas
                </option>
                <option value="income">Solo entradas</option>
                <option value="expense">Solo salidas</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Fecha
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Tipo
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Dirección
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Monto
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Método
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Referencia
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Descripción
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Cargando movimientos...
                    </td>
                  </tr>
                ) : movimientosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No hay movimientos para mostrar.
                    </td>
                  </tr>
                ) : (
                  movimientosFiltrados.map(
                    function mostrarMovimiento(movimiento) {
                      return (
                        <tr key={movimiento.id}>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                            {formatearFecha(
                              movimiento.movement_date,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                            {obtenerTextoTipo(
                              movimiento.movement_type,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm">
                            <span
                              className={
                                movimiento.direction === "income"
                                  ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800"
                                  : "rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800"
                              }
                            >
                              {movimiento.direction === "income"
                                ? "Entrada"
                                : "Salida"}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900">
                            {formatearMonto(
                              movimiento.amount,
                              movimiento.currencies,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                            {obtenerTextoMetodo(
                              movimiento.payment_method,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                            {movimiento.reference_number || "—"}
                          </td>

                          <td className="px-4 py-4 text-sm text-gray-700">
                            {movimiento.description || "—"}
                          </td>
                        </tr>
                      );
                    },
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}