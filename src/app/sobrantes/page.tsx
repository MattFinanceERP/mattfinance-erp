"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "../lib/supabase";

type Moneda = {
  code: string;
  symbol: string;
};

type Cliente = {
  first_name: string;
  last_name: string;
  document_number: string | null;
  phone_primary: string | null;
};

type Prestamo = {
  loan_number: string;
};

type TarjetaDetalle = {
  bank_name: string;
  card_last_four: string;
  employer_name: string | null;
  work_sector: string | null;
};

type RetiroTarjeta = {
  collection_date: string;
  withdrawn_amount: number;
  payment_applied: number;
  client_surplus: number;
  bank_fee: number;
  reference_number: string | null;
  notes: string | null;
  loan_card_details: TarjetaDetalle | null;
};

type Sobrante = {
  id: string;
  organization_id: string;
  client_id: string;
  loan_id: string | null;
  card_collection_id: string;
  currency_id: string;
  original_amount: number;
  delivered_amount: number;
  pending_amount: number;
  status: "pending" | "partial" | "delivered" | "cancelled";
  delivered_at: string | null;
  delivered_to: string | null;
  delivery_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clients: Cliente | null;
  loans: Prestamo | null;
  currencies: Moneda | null;
  card_collection_transactions: RetiroTarjeta | null;
};

type Entrega = {
  id: string;
  delivered_amount: number;
  delivered_to: string;
  receiver_document: string | null;
  delivery_reference: string | null;
  notes: string | null;
  status: string;
  delivered_at: string;
};

type FormularioEntrega = {
  amount: string;
  delivered_to: string;
  receiver_document: string;
  delivery_reference: string;
  notes: string;
};

const formularioInicial: FormularioEntrega = {
  amount: "",
  delivered_to: "",
  receiver_document: "",
  delivery_reference: "",
  notes: "",
};

type FiltroEstado = "all" | "pending" | "partial" | "delivered";

export default function SobrantesPage() {
  const supabase = useMemo(function crearSupabase() {
    return createClient();
  }, []);

  const [sobrantes, setSobrantes] = useState<Sobrante[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] =
    useState<FiltroEstado>("all");
  const [sobranteSeleccionado, setSobranteSeleccionado] =
    useState<Sobrante | null>(null);
  const [mostrarFormularioEntrega, setMostrarFormularioEntrega] =
    useState(false);
  const [formulario, setFormulario] =
    useState<FormularioEntrega>(formularioInicial);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const cargarSobrantes = useCallback(
    async function cargarDesdeSupabase() {
      setCargando(true);
      setMensajeError("");

      const resultado = await supabase
        .from("client_surplus_balances")
        .select(
          "id, organization_id, client_id, loan_id, card_collection_id, currency_id, original_amount, delivered_amount, pending_amount, status, delivered_at, delivered_to, delivery_reference, notes, created_at, updated_at, clients(first_name, last_name, document_number, phone_primary), loans(loan_number), currencies(code, symbol), card_collection_transactions(collection_date, withdrawn_amount, payment_applied, client_surplus, bank_fee, reference_number, notes, loan_card_details(bank_name, card_last_four, employer_name, work_sector))",
        )
        .order("created_at", { ascending: false });

      if (resultado.error) {
        setMensajeError(
          "No se pudieron cargar los sobrantes: " +
            resultado.error.message,
        );
        setSobrantes([]);
      } else {
        setSobrantes(
          (resultado.data || []) as unknown as Sobrante[],
        );
      }

      setCargando(false);
    },
    [supabase],
  );

  useEffect(
    function cargarAlAbrir() {
      void cargarSobrantes();
    },
    [cargarSobrantes],
  );

  async function abrirDetalle(sobrante: Sobrante) {
    setSobranteSeleccionado(sobrante);
    setMostrarFormularioEntrega(false);
    setFormulario(formularioInicial);
    setEntregas([]);
    setMensajeError("");
    setCargandoDetalle(true);

    const resultado = await supabase
      .from("client_surplus_deliveries")
      .select(
        "id, delivered_amount, delivered_to, receiver_document, delivery_reference, notes, status, delivered_at",
      )
      .eq("surplus_balance_id", sobrante.id)
      .order("delivered_at", { ascending: false });

    if (resultado.error) {
      setMensajeError(
        "No se pudo cargar el historial de entregas: " +
          resultado.error.message,
      );
    } else {
      setEntregas((resultado.data || []) as Entrega[]);
    }

    setCargandoDetalle(false);
  }

  function cerrarDetalle() {
    if (!guardando) {
      setSobranteSeleccionado(null);
      setMostrarFormularioEntrega(false);
      setFormulario(formularioInicial);
      setEntregas([]);
      setMensajeError("");
    }
  }

  function abrirEntrega() {
    if (!sobranteSeleccionado) return;

    setFormulario({
      ...formularioInicial,
      amount: Number(
        sobranteSeleccionado.pending_amount,
      ).toFixed(2),
      delivered_to: nombreCliente(sobranteSeleccionado),
    });
    setMostrarFormularioEntrega(true);
    setMensajeError("");
  }

  async function registrarEntrega(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!sobranteSeleccionado) {
      setMensajeError("No hay un sobrante seleccionado.");
      return;
    }

    setGuardando(true);
    setMensajeError("");
    setMensajeExito("");

    const monto = Number(formulario.amount);

    if (!Number.isFinite(monto) || monto <= 0) {
      setMensajeError(
        "El monto a entregar debe ser mayor que cero.",
      );
      setGuardando(false);
      return;
    }

    if (monto > Number(sobranteSeleccionado.pending_amount)) {
      setMensajeError(
        "El monto a entregar supera el saldo pendiente.",
      );
      setGuardando(false);
      return;
    }

    if (formulario.delivered_to.trim() === "") {
      setMensajeError(
        "Debes indicar quién recibe el dinero.",
      );
      setGuardando(false);
      return;
    }

    const resultado = await supabase.rpc(
      "deliver_client_surplus",
      {
        p_surplus_balance_id: sobranteSeleccionado.id,
        p_amount: monto,
        p_delivered_to: formulario.delivered_to.trim(),
        p_receiver_document:
          formulario.receiver_document.trim() || null,
        p_delivery_reference:
          formulario.delivery_reference.trim() || null,
        p_notes: formulario.notes.trim() || null,
      },
    );

    if (resultado.error) {
      setMensajeError(
        "No se pudo registrar la entrega: " +
          resultado.error.message,
      );
      setGuardando(false);
      return;
    }

    const fila = Array.isArray(resultado.data)
      ? resultado.data[0]
      : resultado.data;

    setMensajeExito(
      `Entrega registrada correctamente. Nuevo saldo pendiente: ${formatearMonto(
        Number(fila?.new_pending_amount || 0),
        sobranteSeleccionado.currencies,
      )}.`,
    );

    setMostrarFormularioEntrega(false);
    setFormulario(formularioInicial);
    setSobranteSeleccionado(null);
    setEntregas([]);
    await cargarSobrantes();
    setGuardando(false);
  }

  const sobrantesFiltrados = useMemo(
    function filtrar() {
      const termino = busqueda.trim().toLowerCase();

      return sobrantes.filter(function coincide(sobrante) {
        const cliente = nombreCliente(sobrante).toLowerCase();
        const banco =
          sobrante.card_collection_transactions
            ?.loan_card_details?.bank_name?.toLowerCase() || "";
        const tarjeta =
          sobrante.card_collection_transactions
            ?.loan_card_details?.card_last_four || "";
        const prestamo =
          sobrante.loans?.loan_number?.toLowerCase() || "";
        const referencia =
          sobrante.card_collection_transactions
            ?.reference_number?.toLowerCase() || "";

        const coincideBusqueda =
          termino === "" ||
          cliente.includes(termino) ||
          banco.includes(termino) ||
          tarjeta.includes(termino) ||
          prestamo.includes(termino) ||
          referencia.includes(termino);

        const coincideEstado =
          filtroEstado === "all" ||
          sobrante.status === filtroEstado;

        return coincideBusqueda && coincideEstado;
      });
    },
    [sobrantes, busqueda, filtroEstado],
  );

  const resumen = useMemo(
    function calcularResumen() {
      const pendientes = sobrantes.filter((sobrante) =>
        ["pending", "partial"].includes(sobrante.status),
      );

      return {
        cantidadPendientes: pendientes.length,
        totalPendiente: pendientes.reduce(
          (total, sobrante) =>
            total + Number(sobrante.pending_amount),
          0,
        ),
        totalEntregado: sobrantes.reduce(
          (total, sobrante) =>
            total + Number(sobrante.delivered_amount),
          0,
        ),
        entregadosHoy: sobrantes.filter(
          (sobrante) =>
            sobrante.status === "delivered" &&
            esHoy(sobrante.delivered_at),
        ).length,
      };
    },
    [sobrantes],
  );

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-4xl font-bold text-blue-900">
            Sobrantes de tarjetas
          </h1>
          <p className="mt-2 text-gray-600">
            Controla exclusivamente el dinero sobrante de los
            retiros realizados con tarjetas.
          </p>
        </div>

        {mensajeError !== "" && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {mensajeError}
          </div>
        )}

        {mensajeExito !== "" && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {mensajeExito}
          </div>
        )}

        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TarjetaResumen
            titulo="Sobrantes pendientes"
            valor={String(resumen.cantidadPendientes)}
            detalle="Pendientes o parciales"
          />
          <TarjetaResumen
            titulo="Total pendiente"
            valor={formatearMonto(resumen.totalPendiente, {
              code: "DOP",
              symbol: "RD$",
            })}
            detalle="Dinero aún por entregar"
          />
          <TarjetaResumen
            titulo="Total entregado"
            valor={formatearMonto(resumen.totalEntregado, {
              code: "DOP",
              symbol: "RD$",
            })}
            detalle="Acumulado entregado"
          />
          <TarjetaResumen
            titulo="Entregados hoy"
            valor={String(resumen.entregadosHoy)}
            detalle="Sobrantes completados hoy"
          />
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-blue-900">
                Historial de sobrantes
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Busca por cliente, banco, tarjeta, préstamo o referencia.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="search"
                value={busqueda}
                onChange={(event) =>
                  setBusqueda(event.target.value)
                }
                placeholder="Buscar sobrante..."
                className="rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
              />

              <select
                value={filtroEstado}
                onChange={(event) =>
                  setFiltroEstado(
                    event.target.value as FiltroEstado,
                  )
                }
                className="rounded-lg border border-gray-300 bg-white p-3"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendientes</option>
                <option value="partial">Parciales</option>
                <option value="delivered">Entregados</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Fecha",
                    "Cliente",
                    "Banco",
                    "Tarjeta",
                    "Original",
                    "Entregado",
                    "Pendiente",
                    "Estado",
                    "Acciones",
                  ].map((titulo) => (
                    <th
                      key={titulo}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600"
                    >
                      {titulo}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {cargando ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      Cargando sobrantes...
                    </td>
                  </tr>
                ) : sobrantesFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No hay sobrantes para mostrar.
                    </td>
                  </tr>
                ) : (
                  sobrantesFiltrados.map((sobrante) => (
                    <tr key={sobrante.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearFechaHora(sobrante.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
                        {nombreCliente(sobrante)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {sobrante.card_collection_transactions
                          ?.loan_card_details?.bank_name || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        ****{" "}
                        {sobrante.card_collection_transactions
                          ?.loan_card_details?.card_last_four || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearMonto(
                          sobrante.original_amount,
                          sobrante.currencies,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-green-700">
                        {formatearMonto(
                          sobrante.delivered_amount,
                          sobrante.currencies,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-red-700">
                        {formatearMonto(
                          sobrante.pending_amount,
                          sobrante.currencies,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <span className={claseEstado(sobrante.status)}>
                          {textoEstado(sobrante.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <button
                          type="button"
                          onClick={() => void abrirDetalle(sobrante)}
                          className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {sobranteSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Detalle del sobrante
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Generado exclusivamente por un retiro de tarjeta.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarDetalle}
                className="text-2xl text-gray-500 hover:text-gray-900"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Dato titulo="Cliente" valor={nombreCliente(sobranteSeleccionado)} />
              <Dato
                titulo="Préstamo"
                valor={sobranteSeleccionado.loans?.loan_number || "—"}
              />
              <Dato
                titulo="Banco"
                valor={
                  sobranteSeleccionado.card_collection_transactions
                    ?.loan_card_details?.bank_name || "—"
                }
              />
              <Dato
                titulo="Tarjeta"
                valor={`**** ${
                  sobranteSeleccionado.card_collection_transactions
                    ?.loan_card_details?.card_last_four || "—"
                }`}
              />
              <Dato
                titulo="Fecha del retiro"
                valor={formatearFechaHora(
                  sobranteSeleccionado.card_collection_transactions
                    ?.collection_date ||
                    sobranteSeleccionado.created_at,
                )}
              />
              <Dato
                titulo="Referencia del retiro"
                valor={
                  sobranteSeleccionado.card_collection_transactions
                    ?.reference_number || "—"
                }
              />
              <Dato
                titulo="Monto retirado"
                valor={formatearMonto(
                  sobranteSeleccionado.card_collection_transactions
                    ?.withdrawn_amount || 0,
                  sobranteSeleccionado.currencies,
                )}
              />
              <Dato
                titulo="Aplicado al préstamo"
                valor={formatearMonto(
                  sobranteSeleccionado.card_collection_transactions
                    ?.payment_applied || 0,
                  sobranteSeleccionado.currencies,
                )}
              />
              <Dato
                titulo="Sobrante original"
                valor={formatearMonto(
                  sobranteSeleccionado.original_amount,
                  sobranteSeleccionado.currencies,
                )}
              />
              <Dato
                titulo="Total entregado"
                valor={formatearMonto(
                  sobranteSeleccionado.delivered_amount,
                  sobranteSeleccionado.currencies,
                )}
              />
              <Dato
                titulo="Pendiente"
                valor={formatearMonto(
                  sobranteSeleccionado.pending_amount,
                  sobranteSeleccionado.currencies,
                )}
              />
              <Dato
                titulo="Estado"
                valor={textoEstado(sobranteSeleccionado.status)}
              />
            </div>

            <section className="mt-6 rounded-xl bg-slate-50 p-5">
              <h3 className="font-bold text-blue-900">
                Historial de entregas
              </h3>

              {cargandoDetalle ? (
                <p className="mt-4 text-gray-500">
                  Cargando historial...
                </p>
              ) : entregas.length === 0 ? (
                <p className="mt-4 text-gray-500">
                  Todavía no se ha realizado ninguna entrega.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {entregas.map((entrega) => (
                    <div
                      key={entrega.id}
                      className="rounded-lg bg-white p-4"
                    >
                      <p className="font-bold text-green-700">
                        {formatearMonto(
                          entrega.delivered_amount,
                          sobranteSeleccionado.currencies,
                        )}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Recibido por {entrega.delivered_to}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatearFechaHora(entrega.delivered_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {mostrarFormularioEntrega && (
              <form
                onSubmit={registrarEntrega}
                className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-blue-200 bg-blue-50 p-5 sm:grid-cols-2"
              >
                <div className="sm:col-span-2">
                  <h3 className="text-lg font-bold text-blue-900">
                    Registrar entrega
                  </h3>
                  <p className="mt-1 text-sm text-blue-800">
                    Puedes entregar todo el sobrante o solamente una parte.
                  </p>
                </div>

                <Campo
                  id="amount"
                  etiqueta="Monto a entregar"
                  tipo="number"
                  valor={formulario.amount}
                  cambiar={(valor) =>
                    setFormulario({
                      ...formulario,
                      amount: valor,
                    })
                  }
                  requerido
                />

                <Campo
                  id="delivered_to"
                  etiqueta="Recibido por"
                  valor={formulario.delivered_to}
                  cambiar={(valor) =>
                    setFormulario({
                      ...formulario,
                      delivered_to: valor,
                    })
                  }
                  requerido
                />

                <Campo
                  id="receiver_document"
                  etiqueta="Documento"
                  valor={formulario.receiver_document}
                  cambiar={(valor) =>
                    setFormulario({
                      ...formulario,
                      receiver_document: valor,
                    })
                  }
                />

                <Campo
                  id="delivery_reference"
                  etiqueta="Referencia"
                  valor={formulario.delivery_reference}
                  cambiar={(valor) =>
                    setFormulario({
                      ...formulario,
                      delivery_reference: valor,
                    })
                  }
                />

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Observaciones
                  </label>
                  <textarea
                    rows={3}
                    value={formulario.notes}
                    onChange={(event) =>
                      setFormulario({
                        ...formulario,
                        notes: event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setMostrarFormularioEntrega(false)
                    }
                    disabled={guardando}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-semibold text-gray-700"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={guardando}
                    className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {guardando
                      ? "Entregando..."
                      : "Confirmar entrega"}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cerrarDetalle}
                className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700"
              >
                Cerrar
              </button>

              {["pending", "partial"].includes(
                sobranteSeleccionado.status,
              ) &&
                !mostrarFormularioEntrega && (
                  <button
                    type="button"
                    onClick={abrirEntrega}
                    className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
                  >
                    Entregar sobrante
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function nombreCliente(sobrante: Sobrante) {
  if (!sobrante.clients) return "Cliente no disponible";

  return `${sobrante.clients.first_name} ${sobrante.clients.last_name}`;
}

function formatearMonto(
  monto: number,
  moneda: Moneda | null,
) {
  const simbolo = moneda?.symbol || "RD$";

  return (
    simbolo +
    " " +
    Number(monto).toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function esHoy(fecha: string | null) {
  if (!fecha) return false;

  const valor = new Date(fecha);
  const hoy = new Date();

  return (
    valor.getFullYear() === hoy.getFullYear() &&
    valor.getMonth() === hoy.getMonth() &&
    valor.getDate() === hoy.getDate()
  );
}

function textoEstado(estado: Sobrante["status"]) {
  if (estado === "pending") return "Pendiente";
  if (estado === "partial") return "Parcial";
  if (estado === "delivered") return "Entregado";
  return "Cancelado";
}

function claseEstado(estado: Sobrante["status"]) {
  const base =
    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ";

  if (estado === "pending") {
    return base + "bg-amber-100 text-amber-800";
  }

  if (estado === "partial") {
    return base + "bg-blue-100 text-blue-800";
  }

  if (estado === "delivered") {
    return base + "bg-green-100 text-green-800";
  }

  return base + "bg-gray-200 text-gray-700";
}

function TarjetaResumen({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm font-medium text-gray-600">
        {titulo}
      </p>
      <p className="mt-2 text-2xl font-bold text-blue-900">
        {valor}
      </p>
      <p className="mt-1 text-sm text-gray-500">
        {detalle}
      </p>
    </div>
  );
}

function Dato({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <p className="text-xs font-semibold uppercase text-gray-500">
        {titulo}
      </p>
      <p className="mt-1 font-medium text-gray-900">
        {valor}
      </p>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  valor,
  cambiar,
  tipo = "text",
  requerido = false,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  cambiar: (valor: string) => void;
  tipo?: string;
  requerido?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700"
      >
        {etiqueta}
      </label>
      <input
        id={id}
        type={tipo}
        min={tipo === "number" ? "0.01" : undefined}
        step={tipo === "number" ? "0.01" : undefined}
        value={valor}
        onChange={(event) => cambiar(event.target.value)}
        required={requerido}
        className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
      />
    </div>
  );
}
