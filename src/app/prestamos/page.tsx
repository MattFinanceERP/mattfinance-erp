"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "../lib/supabase";

type Cliente = {
  id: string;
  first_name: string;
  last_name: string;
};

type Moneda = {
  id: string;
  code: string;
  symbol: string;
};

type TipoPrestamo = "personal" | "card" | "collateral";

type FrecuenciaInteres = "weekly" | "biweekly" | "monthly";

type EstadoPrestamo =
  | "draft"
  | "approved"
  | "active"
  | "overdue"
  | "paid"
  | "cancelled";

type Prestamo = {
  id: string;
  loan_number: string;
  loan_type: TipoPrestamo;
  principal_amount: number;
  interest_rate: number;
  interest_frequency: FrecuenciaInteres;
  term_count: number;
  start_date: string;
  due_date: string | null;
  principal_balance: number;
  interest_balance: number;
  status: EstadoPrestamo;
  clients: {
    first_name: string;
    last_name: string;
  } | null;
  currencies: {
    code: string;
    symbol: string;
  } | null;
};

type FormularioPrestamo = {
  client_id: string;
  currency_id: string;
  loan_type: TipoPrestamo;
  principal_amount: string;
  interest_rate: string;
  interest_frequency: FrecuenciaInteres;
  term_count: string;
  start_date: string;
  notes: string;
};

function obtenerFechaActual() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return anio + "-" + mes + "-" + dia;
}

const formularioInicial: FormularioPrestamo = {
  client_id: "",
  currency_id: "",
  loan_type: "personal",
  principal_amount: "",
  interest_rate: "",
  interest_frequency: "monthly",
  term_count: "1",
  start_date: obtenerFechaActual(),
  notes: "",
};

export default function PrestamosPage() {
  const supabase = useMemo(function crearClienteSupabase() {
    return createClient();
  }, []);

  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);

  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");

  const [formulario, setFormulario] =
    useState<FormularioPrestamo>(formularioInicial);

  const cargarDatos = useCallback(
    async function cargarDatosDesdeSupabase() {
      setCargando(true);
      setMensaje("");

      const resultadoClientes = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("status", "active")
        .order("first_name", { ascending: true });

      const resultadoMonedas = await supabase
        .from("currencies")
        .select("id, code, symbol")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      const resultadoPrestamos = await supabase
        .from("loans")
        .select(
          "id, loan_number, loan_type, principal_amount, interest_rate, interest_frequency, term_count, start_date, due_date, principal_balance, interest_balance, status, clients(first_name, last_name), currencies(code, symbol)",
        )
        .order("created_at", { ascending: false });

      if (resultadoClientes.error) {
        setMensaje(
          "No se pudieron cargar los clientes: " +
            resultadoClientes.error.message,
        );
      } else {
        setClientes((resultadoClientes.data || []) as Cliente[]);
      }

      if (resultadoMonedas.error) {
        setMensaje(
          "No se pudieron cargar las monedas: " +
            resultadoMonedas.error.message,
        );
      } else {
        setMonedas((resultadoMonedas.data || []) as Moneda[]);
      }

      if (resultadoPrestamos.error) {
        setMensaje(
          "No se pudieron cargar los préstamos: " +
            resultadoPrestamos.error.message,
        );
        setPrestamos([]);
      } else {
        setPrestamos(
          (resultadoPrestamos.data || []) as unknown as Prestamo[],
        );
      }

      setCargando(false);
    },
    [supabase],
  );

  useEffect(
    function cargarAlAbrirLaPagina() {
      void cargarDatos();
    },
    [cargarDatos],
  );

  function calcularFechaVencimiento(
    fechaInicio: string,
    frecuencia: FrecuenciaInteres,
    cantidadPeriodos: number,
  ) {
    const fecha = new Date(fechaInicio + "T12:00:00");

    if (frecuencia === "weekly") {
      fecha.setDate(fecha.getDate() + cantidadPeriodos * 7);
    }

    if (frecuencia === "biweekly") {
      fecha.setDate(fecha.getDate() + cantidadPeriodos * 15);
    }

    if (frecuencia === "monthly") {
      fecha.setMonth(fecha.getMonth() + cantidadPeriodos);
    }

    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return anio + "-" + mes + "-" + dia;
  }

  async function guardarPrestamo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setGuardando(true);
    setMensaje("");

    const capital = Number(formulario.principal_amount);
    const tasa = Number(formulario.interest_rate);
    const cantidadPeriodos = Number(formulario.term_count);

    if (capital <= 0) {
      setMensaje("El monto del préstamo debe ser mayor que cero.");
      setGuardando(false);
      return;
    }

    if (tasa < 0) {
      setMensaje("La tasa de interés no puede ser negativa.");
      setGuardando(false);
      return;
    }

    if (cantidadPeriodos <= 0) {
      setMensaje("La cantidad de períodos debe ser mayor que cero.");
      setGuardando(false);
      return;
    }

    const interesPorPeriodo = capital * (tasa / 100);
    const interesTotal = interesPorPeriodo * cantidadPeriodos;

    const fechaVencimiento = calcularFechaVencimiento(
      formulario.start_date,
      formulario.interest_frequency,
      cantidadPeriodos,
    );

    const numeroPrestamo =
      "PRE-" +
      Date.now().toString().slice(-10);

    const nuevoPrestamo = {
      client_id: formulario.client_id,
      currency_id: formulario.currency_id,
      loan_number: numeroPrestamo,
      loan_type: formulario.loan_type,
      principal_amount: capital,
      interest_rate: tasa,
      interest_frequency: formulario.interest_frequency,
      term_count: cantidadPeriodos,
      start_date: formulario.start_date,
      due_date: fechaVencimiento,
      principal_balance: capital,
      interest_balance: interesTotal,
      late_fee_balance: 0,
      status: "active",
      notes: formulario.notes.trim() || null,
    };

    const resultado = await supabase
      .from("loans")
      .insert(nuevoPrestamo);

    if (resultado.error) {
      setMensaje(
        "No se pudo guardar el préstamo: " +
          resultado.error.message,
      );
      setGuardando(false);
      return;
    }

    setFormulario({
      ...formularioInicial,
      currency_id:
        monedas.length > 0 ? monedas[0].id : "",
    });

    setModalAbierto(false);
    await cargarDatos();
    setGuardando(false);
  }

  const prestamosFiltrados = useMemo(
    function filtrarPrestamos() {
      const termino = busqueda.trim().toLowerCase();

      if (termino === "") {
        return prestamos;
      }

      return prestamos.filter(function coincide(prestamo) {
        const nombreCliente = prestamo.clients
          ? (
              prestamo.clients.first_name +
              " " +
              prestamo.clients.last_name
            ).toLowerCase()
          : "";

        return (
          prestamo.loan_number.toLowerCase().includes(termino) ||
          nombreCliente.includes(termino) ||
          obtenerTextoTipo(prestamo.loan_type)
            .toLowerCase()
            .includes(termino) ||
          obtenerTextoEstado(prestamo.status)
            .toLowerCase()
            .includes(termino)
        );
      });
    },
    [busqueda, prestamos],
  );

  function obtenerTextoTipo(tipo: TipoPrestamo) {
    if (tipo === "personal") {
      return "Personal";
    }

    if (tipo === "card") {
      return "Con tarjeta";
    }

    return "Con garantía";
  }

  function obtenerTextoFrecuencia(
    frecuencia: FrecuenciaInteres,
  ) {
    if (frecuencia === "weekly") {
      return "Semanal";
    }

    if (frecuencia === "biweekly") {
      return "Quincenal";
    }

    return "Mensual";
  }

  function obtenerTextoEstado(estado: EstadoPrestamo) {
    if (estado === "draft") return "Borrador";
    if (estado === "approved") return "Aprobado";
    if (estado === "active") return "Activo";
    if (estado === "overdue") return "Vencido";
    if (estado === "paid") return "Pagado";

    return "Cancelado";
  }

  function obtenerClaseEstado(estado: EstadoPrestamo) {
    const claseBase =
      "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ";

    if (estado === "active") {
      return claseBase + "bg-green-100 text-green-800";
    }

    if (estado === "paid") {
      return claseBase + "bg-blue-100 text-blue-800";
    }

    if (estado === "overdue") {
      return claseBase + "bg-red-100 text-red-800";
    }

    if (estado === "cancelled") {
      return claseBase + "bg-gray-200 text-gray-700";
    }

    return claseBase + "bg-yellow-100 text-yellow-800";
  }

  function formatearMonto(
    monto: number,
    moneda: Prestamo["currencies"],
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

  function abrirModal() {
    setMensaje("");

    setFormulario({
      ...formularioInicial,
      currency_id:
        monedas.length > 0 ? monedas[0].id : "",
    });

    setModalAbierto(true);
  }

  function cerrarModal() {
    if (!guardando) {
      setModalAbierto(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900">
              Préstamos
            </h1>

            <p className="mt-2 text-gray-600">
              Administra los préstamos y sus balances
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModal}
            className="rounded-lg bg-blue-900 px-5 py-3 font-medium text-white transition hover:bg-blue-800"
          >
            Nuevo préstamo
          </button>
        </div>

        {mensaje !== "" && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {mensaje}
          </div>
        )}

        <div className="mt-8">
          <label
            htmlFor="buscar-prestamo"
            className="sr-only"
          >
            Buscar préstamo
          </label>

          <input
            id="buscar-prestamo"
            type="search"
            value={busqueda}
            onChange={function actualizarBusqueda(event) {
              setBusqueda(event.target.value);
            }}
            placeholder="Buscar por número, cliente, tipo o estado..."
            className="w-full max-w-md rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl bg-white shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Número
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Cliente
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Tipo
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Capital
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Interés
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Frecuencia
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Cargando préstamos...
                    </td>
                  </tr>
                ) : prestamosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No se encontraron préstamos
                    </td>
                  </tr>
                ) : (
                  prestamosFiltrados.map(
                    function mostrarPrestamo(prestamo) {
                      return (
                        <tr
                          key={prestamo.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-blue-900">
                          <button
  type="button"
  onClick={function abrirDetallePrestamo() {
    window.location.href = "/prestamos/" + prestamo.id;
  }}
  className="font-medium text-blue-900 hover:underline"
>
  {prestamo.loan_number}
</button>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-900">
                            {prestamo.clients
                              ? prestamo.clients.first_name +
                                " " +
                                prestamo.clients.last_name
                              : "Sin cliente"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                            {obtenerTextoTipo(
                              prestamo.loan_type,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                            {formatearMonto(
                              prestamo.principal_amount,
                              prestamo.currencies,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                            {prestamo.interest_rate}%
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                            {obtenerTextoFrecuencia(
                              prestamo.interest_frequency,
                            )}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-sm">
                            <span
                              className={obtenerClaseEstado(
                                prestamo.status,
                              )}
                            >
                              {obtenerTextoEstado(
                                prestamo.status,
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    },
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-blue-900">
                Nuevo préstamo
              </h2>

              <button
                type="button"
                onClick={cerrarModal}
                className="text-2xl text-gray-500 hover:text-gray-900"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={guardarPrestamo}
              className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <div className="sm:col-span-2">
                <label
                  htmlFor="client_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cliente
                </label>

                <select
                  id="client_id"
                  value={formulario.client_id}
                  onChange={function actualizarCliente(event) {
                    setFormulario({
                      ...formulario,
                      client_id: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                  required
                >
                  <option value="">
                    Selecciona un cliente
                  </option>

                  {clientes.map(function mostrarCliente(cliente) {
                    return (
                      <option
                        key={cliente.id}
                        value={cliente.id}
                      >
                        {cliente.first_name} {cliente.last_name}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label
                  htmlFor="currency_id"
                  className="block text-sm font-medium text-gray-700"
                >
                  Moneda
                </label>

                <select
                  id="currency_id"
                  value={formulario.currency_id}
                  onChange={function actualizarMoneda(event) {
                    setFormulario({
                      ...formulario,
                      currency_id: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                  required
                >
                  <option value="">
                    Selecciona una moneda
                  </option>

                  {monedas.map(function mostrarMoneda(moneda) {
                    return (
                      <option
                        key={moneda.id}
                        value={moneda.id}
                      >
                        {moneda.code} - {moneda.symbol}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label
                  htmlFor="loan_type"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tipo de préstamo
                </label>

                <select
                  id="loan_type"
                  value={formulario.loan_type}
                  onChange={function actualizarTipo(event) {
                    setFormulario({
                      ...formulario,
                      loan_type:
                        event.target.value as TipoPrestamo,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                >
                  <option value="personal">
                    Personal
                  </option>

                  <option value="card">
                    Con tarjeta
                  </option>

                  <option value="collateral">
                    Con garantía
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="principal_amount"
                  className="block text-sm font-medium text-gray-700"
                >
                  Monto del préstamo
                </label>

                <input
                  id="principal_amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formulario.principal_amount}
                  onChange={function actualizarMonto(event) {
                    setFormulario({
                      ...formulario,
                      principal_amount: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="interest_rate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tasa por período (%)
                </label>

                <input
                  id="interest_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formulario.interest_rate}
                  onChange={function actualizarTasa(event) {
                    setFormulario({
                      ...formulario,
                      interest_rate: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="interest_frequency"
                  className="block text-sm font-medium text-gray-700"
                >
                  Frecuencia
                </label>

                <select
                  id="interest_frequency"
                  value={formulario.interest_frequency}
                  onChange={function actualizarFrecuencia(event) {
                    setFormulario({
                      ...formulario,
                      interest_frequency:
                        event.target
                          .value as FrecuenciaInteres,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                >
                  <option value="weekly">
                    Semanal
                  </option>

                  <option value="biweekly">
                    Quincenal
                  </option>

                  <option value="monthly">
                    Mensual
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="term_count"
                  className="block text-sm font-medium text-gray-700"
                >
                  Cantidad de períodos
                </label>

                <input
                  id="term_count"
                  type="number"
                  min="1"
                  step="1"
                  value={formulario.term_count}
                  onChange={function actualizarPlazo(event) {
                    setFormulario({
                      ...formulario,
                      term_count: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="start_date"
                  className="block text-sm font-medium text-gray-700"
                >
                  Fecha de inicio
                </label>

                <input
                  id="start_date"
                  type="date"
                  value={formulario.start_date}
                  onChange={function actualizarFecha(event) {
                    setFormulario({
                      ...formulario,
                      start_date: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Observaciones
                </label>

                <textarea
                  id="notes"
                  rows={3}
                  value={formulario.notes}
                  onChange={function actualizarNotas(event) {
                    setFormulario({
                      ...formulario,
                      notes: event.target.value,
                    });
                  }}
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={guardando}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-blue-900 px-5 py-3 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando
                    ? "Guardando..."
                    : "Guardar préstamo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}