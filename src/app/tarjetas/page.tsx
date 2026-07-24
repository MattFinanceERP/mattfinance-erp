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
  phone_primary: string | null;
};

type PrestamoTarjeta = {
  id: string;
  loan_number: string;
  principal_balance: number;
  interest_balance: number;
  late_fee_balance: number;
  status: string;
  currency_id: string;
  currencies: Moneda | null;
};

type TarjetaPrestamo = {
  id: string;
  loan_id: string;
  client_id: string;
  bank_name: string;
  card_last_four: string;
  cardholder_name: string;
  employer_name: string | null;
  work_sector: string | null;
  work_location: string | null;
  collection_frequency: string;
  collection_weekday: string | null;
  collection_day_1: number | null;
  collection_day_2: number | null;
  next_collection_date: string | null;
  card_status: string;
  clients: Cliente | null;
  loans: PrestamoTarjeta | null;
};

type FormularioRetiro = {
  withdrawn_amount: string;
  payment_applied: string;
  bank_fee: string;
  atm_location: string;
  reference_number: string;
  notes: string;
};

const formularioInicial: FormularioRetiro = {
  withdrawn_amount: "",
  payment_applied: "",
  bank_fee: "0",
  atm_location: "",
  reference_number: "",
  notes: "",
};

export default function TarjetasPage() {
  const supabase = useMemo(function crearSupabase() {
    return createClient();
  }, []);

  const [tarjetas, setTarjetas] = useState<TarjetaPrestamo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroBanco, setFiltroBanco] = useState("all");
  const [filtroSector, setFiltroSector] = useState("all");
  const [filtroFecha, setFiltroFecha] = useState("all");
  const [tarjetaSeleccionada, setTarjetaSeleccionada] =
    useState<TarjetaPrestamo | null>(null);
  const [formulario, setFormulario] =
    useState<FormularioRetiro>(formularioInicial);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const cargarTarjetas = useCallback(
    async function cargarDesdeSupabase() {
      setCargando(true);
      setMensajeError("");

      const resultado = await supabase
        .from("loan_card_details")
        .select(
          "id, loan_id, client_id, bank_name, card_last_four, cardholder_name, employer_name, work_sector, work_location, collection_frequency, collection_weekday, collection_day_1, collection_day_2, next_collection_date, card_status, clients(first_name, last_name, phone_primary), loans(id, loan_number, principal_balance, interest_balance, late_fee_balance, status, currency_id, currencies(code, symbol))",
        )
        .order("next_collection_date", {
          ascending: true,
          nullsFirst: false,
        });

      if (resultado.error) {
        setMensajeError(
          "No se pudieron cargar las tarjetas: " +
            resultado.error.message,
        );
        setTarjetas([]);
      } else {
        setTarjetas(
          (resultado.data || []) as unknown as TarjetaPrestamo[],
        );
      }

      setCargando(false);
    },
    [supabase],
  );

  useEffect(
    function cargarAlAbrir() {
      void cargarTarjetas();
    },
    [cargarTarjetas],
  );

  const bancos = useMemo(
    function obtenerBancos() {
      return Array.from(
        new Set(tarjetas.map((tarjeta) => tarjeta.bank_name)),
      ).sort();
    },
    [tarjetas],
  );

  const sectores = useMemo(
    function obtenerSectores() {
      return Array.from(
        new Set(
          tarjetas
            .map((tarjeta) => tarjeta.work_sector || "")
            .filter(Boolean),
        ),
      ).sort();
    },
    [tarjetas],
  );

  const tarjetasFiltradas = useMemo(
    function filtrarTarjetas() {
      const termino = busqueda.trim().toLowerCase();

      return tarjetas.filter(function coincide(tarjeta) {
        const cliente = tarjeta.clients
          ? `${tarjeta.clients.first_name} ${tarjeta.clients.last_name}`.toLowerCase()
          : "";

        const coincideBusqueda =
          termino === "" ||
          cliente.includes(termino) ||
          tarjeta.cardholder_name.toLowerCase().includes(termino) ||
          tarjeta.bank_name.toLowerCase().includes(termino) ||
          tarjeta.card_last_four.includes(termino) ||
          (tarjeta.employer_name || "").toLowerCase().includes(termino) ||
          (tarjeta.work_sector || "").toLowerCase().includes(termino) ||
          (tarjeta.loans?.loan_number || "").toLowerCase().includes(termino);

        const coincideBanco =
          filtroBanco === "all" || tarjeta.bank_name === filtroBanco;

        const coincideSector =
          filtroSector === "all" || tarjeta.work_sector === filtroSector;

        const coincideFecha =
          filtroFecha === "all" ||
          (filtroFecha === "today" &&
            esHoy(tarjeta.next_collection_date)) ||
          (filtroFecha === "overdue" &&
            estaVencida(tarjeta.next_collection_date)) ||
          (filtroFecha === "week" &&
            esEstaSemana(tarjeta.next_collection_date));

        return (
          coincideBusqueda &&
          coincideBanco &&
          coincideSector &&
          coincideFecha
        );
      });
    },
    [tarjetas, busqueda, filtroBanco, filtroSector, filtroFecha],
  );

  const resumen = useMemo(
    function calcularResumen() {
      return {
        total: tarjetas.length,
        hoy: tarjetas.filter((tarjeta) =>
          esHoy(tarjeta.next_collection_date),
        ).length,
        vencidas: tarjetas.filter((tarjeta) =>
          estaVencida(tarjeta.next_collection_date),
        ).length,
        semana: tarjetas.filter((tarjeta) =>
          esEstaSemana(tarjeta.next_collection_date),
        ).length,
        balancePendiente: tarjetas.reduce(
          (total, tarjeta) => total + obtenerTotalPendiente(tarjeta),
          0,
        ),
      };
    },
    [tarjetas],
  );

  function abrirRetiro(tarjeta: TarjetaPrestamo) {
    const totalPendiente = obtenerTotalPendiente(tarjeta);

    setTarjetaSeleccionada(tarjeta);
    setFormulario({
      ...formularioInicial,
      payment_applied:
        totalPendiente > 0 ? totalPendiente.toFixed(2) : "0",
    });
    setMensajeError("");
    setMensajeExito("");
  }

  function cerrarRetiro() {
    if (!guardando) {
      setTarjetaSeleccionada(null);
      setFormulario(formularioInicial);
      setMensajeError("");
    }
  }

  function actualizarMontoRetirado(valor: string) {
    if (!tarjetaSeleccionada) return;

    const retirado = Number(valor);
    const comision = Number(formulario.bank_fee) || 0;
    const totalPendiente = obtenerTotalPendiente(tarjetaSeleccionada);

    const aplicable =
      Number.isFinite(retirado) && retirado > 0
        ? Math.min(Math.max(retirado - comision, 0), totalPendiente)
        : 0;

    setFormulario({
      ...formulario,
      withdrawn_amount: valor,
      payment_applied: aplicable.toFixed(2),
    });
  }

  function actualizarComision(valor: string) {
    if (!tarjetaSeleccionada) return;

    const retirado = Number(formulario.withdrawn_amount);
    const comision = Number(valor) || 0;
    const totalPendiente = obtenerTotalPendiente(tarjetaSeleccionada);

    const aplicable =
      Number.isFinite(retirado) && retirado > 0
        ? Math.min(Math.max(retirado - comision, 0), totalPendiente)
        : 0;

    setFormulario({
      ...formulario,
      bank_fee: valor,
      payment_applied: aplicable.toFixed(2),
    });
  }

  async function registrarRetiro(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!tarjetaSeleccionada) {
      setMensajeError("Debes seleccionar una tarjeta.");
      return;
    }

    setGuardando(true);
    setMensajeError("");
    setMensajeExito("");

    const retirado = Number(formulario.withdrawn_amount);
    const aplicado = Number(formulario.payment_applied);
    const comision = Number(formulario.bank_fee);

    if (!Number.isFinite(retirado) || retirado <= 0) {
      setMensajeError("El monto retirado debe ser mayor que cero.");
      setGuardando(false);
      return;
    }

    if (
      !Number.isFinite(aplicado) ||
      aplicado < 0 ||
      !Number.isFinite(comision) ||
      comision < 0
    ) {
      setMensajeError(
        "El pago aplicado y la comisión deben ser valores válidos.",
      );
      setGuardando(false);
      return;
    }

    if (aplicado + comision > retirado) {
      setMensajeError(
        "El pago aplicado y la comisión no pueden superar el monto retirado.",
      );
      setGuardando(false);
      return;
    }

    const prestamo = tarjetaSeleccionada.loans;

    if (!prestamo) {
      setMensajeError(
        "No se encontró el préstamo relacionado con esta tarjeta.",
      );
      setGuardando(false);
      return;
    }

    const totalPendiente = obtenerTotalPendiente(tarjetaSeleccionada);

    if (aplicado > totalPendiente) {
      setMensajeError(
        "El pago aplicado supera el balance pendiente del préstamo.",
      );
      setGuardando(false);
      return;
    }
    const resultado = await supabase.rpc(
      "register_card_collection",
      {
        p_card_detail_id: tarjetaSeleccionada.id,
        p_withdrawn_amount: retirado,
        p_payment_applied: aplicado,
        p_interest_amount: 0,
        p_principal_amount: 0,
        p_late_fee_amount: 0,
        p_bank_fee: comision,
        p_atm_location: formulario.atm_location.trim() || null,
        p_reference_number:
          formulario.reference_number.trim() || null,
        p_notes: formulario.notes.trim() || null,
      },
    );

    if (resultado.error) {
      setMensajeError(
        "No se pudo registrar el retiro: " +
          resultado.error.message,
      );
      setGuardando(false);
      return;
    }

    const fila = Array.isArray(resultado.data)
      ? resultado.data[0]
      : resultado.data;

    const sobrante = Number(
      fila?.client_surplus || retirado - aplicado - comision,
    );

    setMensajeExito(
      `Retiro registrado correctamente. Pago aplicado: ${formatearMonto(
        aplicado,
        prestamo.currencies,
      )}. Sobrante del cliente: ${formatearMonto(
        sobrante,
        prestamo.currencies,
      )}.`,
    );

    setTarjetaSeleccionada(null);
    setFormulario(formularioInicial);
    await cargarTarjetas();
    setGuardando(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div>
          <h1 className="text-4xl font-bold text-blue-900">
            Agenda de tarjetas
          </h1>
          <p className="mt-2 text-gray-600">
            Organiza las tarjetas por fecha de cobro, banco,
            empresa y sector.
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

        <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <TarjetaResumen titulo="Tarjetas activas" valor={String(resumen.total)} detalle="Registradas en custodia" />
          <TarjetaResumen titulo="Cobros de hoy" valor={String(resumen.hoy)} detalle="Programados para hoy" />
          <TarjetaResumen titulo="Vencidas" valor={String(resumen.vencidas)} detalle="Fechas que ya pasaron" />
          <TarjetaResumen titulo="Esta semana" valor={String(resumen.semana)} detalle="Próximos siete días" />
          <TarjetaResumen
            titulo="Balance pendiente"
            valor={formatearMonto(resumen.balancePendiente, {
              code: "DOP",
              symbol: "RD$",
            })}
            detalle="Suma de préstamos con tarjeta"
          />
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-bold text-blue-900">
                Tarjetas por cobrar
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                Selecciona una tarjeta para registrar el retiro.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar cliente, banco o empresa..."
                className="rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
              />

              <select
                value={filtroFecha}
                onChange={(event) => setFiltroFecha(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white p-3"
              >
                <option value="all">Todas las fechas</option>
                <option value="today">Cobran hoy</option>
                <option value="week">Esta semana</option>
                <option value="overdue">Fechas vencidas</option>
              </select>

              <select
                value={filtroBanco}
                onChange={(event) => setFiltroBanco(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white p-3"
              >
                <option value="all">Todos los bancos</option>
                {bancos.map((banco) => (
                  <option key={banco} value={banco}>
                    {banco}
                  </option>
                ))}
              </select>

              <select
                value={filtroSector}
                onChange={(event) => setFiltroSector(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white p-3"
              >
                <option value="all">Todos los sectores</option>
                {sectores.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Próximo cobro",
                    "Cliente",
                    "Banco",
                    "Tarjeta",
                    "Empresa",
                    "Sector",
                    "Frecuencia",
                    "Balance",
                    "Acción",
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
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      Cargando tarjetas...
                    </td>
                  </tr>
                ) : tarjetasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No hay tarjetas para mostrar.
                    </td>
                  </tr>
                ) : (
                  tarjetasFiltradas.map((tarjeta) => (
                    <tr key={tarjeta.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm">
                        <span
                          className={
                            estaVencida(tarjeta.next_collection_date)
                              ? "font-semibold text-red-700"
                              : esHoy(tarjeta.next_collection_date)
                                ? "font-semibold text-amber-700"
                                : "text-gray-700"
                          }
                        >
                          {formatearFecha(tarjeta.next_collection_date)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                        {tarjeta.clients
                          ? `${tarjeta.clients.first_name} ${tarjeta.clients.last_name}`
                          : tarjeta.cardholder_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {tarjeta.bank_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        **** {tarjeta.card_last_four}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {tarjeta.employer_name || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {tarjeta.work_sector || "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {obtenerFrecuencia(tarjeta.collection_frequency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-blue-900">
                        {formatearMonto(
                          obtenerTotalPendiente(tarjeta),
                          tarjeta.loans?.currencies || null,
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <button
                          type="button"
                          onClick={() => abrirRetiro(tarjeta)}
                          disabled={
                            !tarjeta.loans ||
                            !["active", "overdue"].includes(
                              tarjeta.loans.status,
                            )
                          }
                          className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Registrar retiro
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

      {tarjetaSeleccionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Registrar retiro
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {tarjetaSeleccionada.bank_name} · ****{" "}
                  {tarjetaSeleccionada.card_last_four}
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarRetiro}
                className="text-2xl text-gray-500 hover:text-gray-900"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
              <Dato
                titulo="Cliente"
                valor={
                  tarjetaSeleccionada.clients
                    ? `${tarjetaSeleccionada.clients.first_name} ${tarjetaSeleccionada.clients.last_name}`
                    : tarjetaSeleccionada.cardholder_name
                }
              />
              <Dato
                titulo="Préstamo"
                valor={tarjetaSeleccionada.loans?.loan_number || "—"}
              />
              <Dato
                titulo="Balance"
                valor={formatearMonto(
                  obtenerTotalPendiente(tarjetaSeleccionada),
                  tarjetaSeleccionada.loans?.currencies || null,
                )}
              />
            </div>

            {mensajeError !== "" && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {mensajeError}
              </div>
            )}

            <form
              onSubmit={registrarRetiro}
              className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <Campo
                id="withdrawn_amount"
                etiqueta="Monto retirado"
                tipo="number"
                valor={formulario.withdrawn_amount}
                cambiar={actualizarMontoRetirado}
                requerido
              />
              <Campo
                id="bank_fee"
                etiqueta="Comisión bancaria"
                tipo="number"
                valor={formulario.bank_fee}
                cambiar={actualizarComision}
              />
              <Campo
                id="payment_applied"
                etiqueta="Aplicar al préstamo"
                tipo="number"
                valor={formulario.payment_applied}
                cambiar={(valor) =>
                  setFormulario({
                    ...formulario,
                    payment_applied: valor,
                  })
                }
                requerido
              />

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sobrante del cliente
                </label>
                <div className="mt-1 rounded-lg border border-green-200 bg-green-50 p-3 font-bold text-green-800">
                  {formatearMonto(
                    calcularSobrante(formulario),
                    tarjetaSeleccionada.loans?.currencies || null,
                  )}
                </div>
              </div>

              <Campo
                id="atm_location"
                etiqueta="Cajero o ubicación"
                valor={formulario.atm_location}
                cambiar={(valor) =>
                  setFormulario({
                    ...formulario,
                    atm_location: valor,
                  })
                }
              />
              <Campo
                id="reference_number"
                etiqueta="Referencia"
                valor={formulario.reference_number}
                cambiar={(valor) =>
                  setFormulario({
                    ...formulario,
                    reference_number: valor,
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
                  className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={cerrarRetiro}
                  disabled={guardando}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {guardando ? "Registrando..." : "Registrar retiro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function obtenerTotalPendiente(tarjeta: TarjetaPrestamo) {
  if (!tarjeta.loans) return 0;

  return (
    Number(tarjeta.loans.principal_balance) +
    Number(tarjeta.loans.interest_balance) +
    Number(tarjeta.loans.late_fee_balance)
  );
}

function calcularSobrante(formulario: FormularioRetiro) {
  const retirado = Number(formulario.withdrawn_amount) || 0;
  const aplicado = Number(formulario.payment_applied) || 0;
  const comision = Number(formulario.bank_fee) || 0;

  return Math.max(retirado - aplicado - comision, 0);
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

function formatearFecha(fecha: string | null) {
  if (!fecha) return "Sin fecha";

  return new Date(fecha + "T12:00:00").toLocaleDateString(
    "es-DO",
  );
}

function obtenerFrecuencia(frecuencia: string) {
  if (frecuencia === "weekly") return "Semanal";
  if (frecuencia === "biweekly") return "Quincenal";
  return "Mensual";
}

function esHoy(fecha: string | null) {
  if (!fecha) return false;

  return fecha === obtenerFechaLocal(new Date());
}

function estaVencida(fecha: string | null) {
  if (!fecha) return false;

  return fecha < obtenerFechaLocal(new Date());
}

function esEstaSemana(fecha: string | null) {
  if (!fecha) return false;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + 7);

  const fechaCobro = new Date(fecha + "T12:00:00");

  return fechaCobro >= hoy && fechaCobro <= limite;
}

function obtenerFechaLocal(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
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
    <div>
      <p className="text-xs font-semibold uppercase text-gray-500">
        {titulo}
      </p>
      <p className="mt-1 font-semibold text-gray-900">
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
        min={tipo === "number" ? "0" : undefined}
        step={tipo === "number" ? "0.01" : undefined}
        value={valor}
        onChange={(event) => cambiar(event.target.value)}
        required={requerido}
        className="mt-1 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
      />
    </div>
  );
}

