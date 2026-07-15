"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase";

type Moneda = {
  id: string;
  code: string;
  symbol: string;
};

type MovimientoCaja = {
  id: string;
  organization_id: string;
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

type TipoOperacion = "income" | "expense";
type ModoOperacion = "manual" | "currency_exchange" | "check_exchange";
type TipoCambioDivisa = "buy_foreign" | "sell_foreign";

type FormularioOperacion = {
  direction: TipoOperacion | "";
  currency_code: string;
  amount: string;
  category: string;
  payment_method: string;
  reference_number: string;
  description: string;
  exchange_type: TipoCambioDivisa;
  foreign_currency_code: string;
  foreign_amount: string;
  exchange_rate: string;
  check_amount: string;
  check_fee_percent: string;
  check_bank: string;
  check_number: string;
  check_holder: string;
  check_date: string;
};

const formularioInicial: FormularioOperacion = {
  direction: "",
  currency_code: "",
  amount: "",
  category: "",
  payment_method: "cash",
  reference_number: "",
  description: "",
  exchange_type: "buy_foreign",
  foreign_currency_code: "",
  foreign_amount: "",
  exchange_rate: "",
  check_amount: "",
  check_fee_percent: "2",
  check_bank: "popular",
  check_number: "",
  check_holder: "",
  check_date: "",
};

export default function CajaPage() {
  const supabase = useMemo(function crearSupabase() {
    return createClient();
  }, []);

  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoOperacion, setGuardandoOperacion] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");
  const [filtroMoneda, setFiltroMoneda] = useState("all");
  const [filtroDireccion, setFiltroDireccion] = useState("all");
  const [modalOperacionAbierto, setModalOperacionAbierto] = useState(false);
  const [modoOperacion, setModoOperacion] =
    useState<ModoOperacion>("manual");
  const [formularioOperacion, setFormularioOperacion] =
    useState<FormularioOperacion>(formularioInicial);

  const cargarMovimientos = useCallback(
    async function cargarDesdeSupabase() {
      setCargando(true);
      setMensajeError("");

      const resultado = await supabase
        .from("cash_movements")
        .select(
          "id, organization_id, movement_date, movement_type, direction, amount, reference_number, description, payment_method, status, currencies(id, code, symbol)",
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
        setMovimientos((resultado.data || []) as unknown as MovimientoCaja[]);
      }

      setCargando(false);
    },
    [supabase],
  );

  const cargarMonedas = useCallback(
    async function cargarMonedasDesdeSupabase() {
      const resultado = await supabase
        .from("currencies")
        .select("id, code, symbol")
        .order("code", { ascending: true });

      if (resultado.error) {
        setMensajeError(
          "No se pudieron cargar las monedas: " + resultado.error.message,
        );
        setMonedas([]);
        return;
      }

      setMonedas((resultado.data || []) as Moneda[]);
    },
    [supabase],
  );

  useEffect(
    function cargarAlAbrirPagina() {
      void cargarMovimientos();
      void cargarMonedas();
    },
    [cargarMovimientos, cargarMonedas],
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
          actual.ingresos += Number(movimiento.amount);
        } else {
          actual.egresos += Number(movimiento.amount);
        }

        actual.balance = actual.ingresos - actual.egresos;
        resumen.set(codigo, actual);
      });

      return Array.from(resumen.values());
    },
    [movimientos],
  );

  const monedasDisponibles = useMemo(
    function obtenerMonedasDisponibles() {
      if (monedas.length > 0) {
        return monedas;
      }

      const monedasDeMovimientos = new Map<string, Moneda>();

      movimientos.forEach(function guardarMoneda(movimiento) {
        if (movimiento.currencies) {
          monedasDeMovimientos.set(
            movimiento.currencies.code,
            movimiento.currencies,
          );
        }
      });

      return Array.from(monedasDeMovimientos.values()).sort(
        function ordenar(monedaA, monedaB) {
          return monedaA.code.localeCompare(monedaB.code);
        },
      );
    },
    [monedas, movimientos],
  );

  const movimientosFiltrados = useMemo(
    function filtrarMovimientos() {
      return movimientos.filter(function coincide(movimiento) {
        const coincideMoneda =
          filtroMoneda === "all" ||
          movimiento.currencies?.code === filtroMoneda;

        const coincideDireccion =
          filtroDireccion === "all" || movimiento.direction === filtroDireccion;

        return coincideMoneda && coincideDireccion;
      });
    },
    [movimientos, filtroMoneda, filtroDireccion],
  );

  function abrirModalOperacion() {
    const monedaPredeterminada =
      monedasDisponibles.find((moneda) => moneda.code === "DOP") ??
      monedasDisponibles[0];

    const primeraDivisa =
      monedasDisponibles.find((moneda) => moneda.code !== "DOP") ??
      monedasDisponibles[0];

    setModoOperacion("manual");
    setFormularioOperacion({
      ...formularioInicial,
      currency_code: monedaPredeterminada?.code ?? "",
      foreign_currency_code: primeraDivisa?.code ?? "",
    });
    setMensajeError("");
    setMensajeExito("");
    setModalOperacionAbierto(true);
  }

  function cerrarModalOperacion() {
    setModalOperacionAbierto(false);
    setModoOperacion("manual");
    setFormularioOperacion(formularioInicial);
    setMensajeError("");
    setMensajeExito("");
  }

  function obtenerTipoMovimientoManual(
    categoria: string,
    direccion: TipoOperacion,
  ) {
    if (categoria === "expense" || categoria === "payroll") {
      return "expense";
    }

    if (categoria === "bank_deposit") {
      return "deposit";
    }

    if (categoria === "owner_withdrawal") {
      return "withdrawal";
    }

    return direccion === "expense" ? "expense" : "adjustment";
  }

  function generarNumeroOperacion() {
    const ahora = new Date();
    const fecha = ahora
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const aleatorio = Math.random().toString(36).slice(2, 6).toUpperCase();

    return `CAJ-${fecha}-${aleatorio}`;
  }

  function obtenerOrganizationId() {
    return movimientos.find(
      (movimiento) => Boolean(movimiento.organization_id),
    )?.organization_id;
  }

  function obtenerMonedaPorCodigo(codigo: string) {
    return monedasDisponibles.find(
      (moneda) => moneda.code === codigo,
    );
  }

  async function registrarCambioDivisas() {
    const montoDivisa = Number(formularioOperacion.foreign_amount);
    const tasa = Number(formularioOperacion.exchange_rate);

    if (formularioOperacion.foreign_currency_code === "") {
      setMensajeError("Debes seleccionar la divisa.");
      return;
    }

    if (formularioOperacion.foreign_currency_code === "DOP") {
      setMensajeError(
        "La divisa extranjera no puede ser DOP.",
      );
      return;
    }

    if (!Number.isFinite(montoDivisa) || montoDivisa <= 0) {
      setMensajeError(
        "El monto de la divisa debe ser mayor que cero.",
      );
      return;
    }

    if (!Number.isFinite(tasa) || tasa <= 0) {
      setMensajeError(
        "La tasa de cambio debe ser mayor que cero.",
      );
      return;
    }

    const monedaExtranjera = obtenerMonedaPorCodigo(
      formularioOperacion.foreign_currency_code,
    );
    const monedaDop = obtenerMonedaPorCodigo("DOP");
    const organizationId = obtenerOrganizationId();

    if (!monedaExtranjera || !monedaDop) {
      setMensajeError(
        "Deben existir DOP y la divisa seleccionada en la tabla currencies.",
      );
      return;
    }

    if (!organizationId) {
      setMensajeError(
        "No se pudo determinar la organización. Debe existir al menos un movimiento de caja previo.",
      );
      return;
    }

    const montoDop = Number((montoDivisa * tasa).toFixed(2));
    const numeroOperacion =
      formularioOperacion.reference_number.trim() ||
      generarNumeroOperacion();
    const fechaOperacion = new Date().toISOString();
    const esCompra =
      formularioOperacion.exchange_type === "buy_foreign";

    const descripcionBase =
      formularioOperacion.description.trim() ||
      (esCompra
        ? `Compra de ${monedaExtranjera.code}`
        : `Venta de ${monedaExtranjera.code}`);

    const movimientosCambio = [
      {
        organization_id: organizationId,
        currency_id: monedaExtranjera.id,
        movement_date: fechaOperacion,
        movement_type: "currency_exchange",
        direction: esCompra ? "income" : "expense",
        amount: montoDivisa,
        source_type: "currency_exchange",
        source_id: null,
        reference_number: numeroOperacion,
        description:
          `${descripcionBase}. Tasa: ${tasa.toFixed(4)} DOP por ${monedaExtranjera.code}.`,
        payment_method: formularioOperacion.payment_method,
        status: "posted",
      },
      {
        organization_id: organizationId,
        currency_id: monedaDop.id,
        movement_date: fechaOperacion,
        movement_type: "currency_exchange",
        direction: esCompra ? "expense" : "income",
        amount: montoDop,
        source_type: "currency_exchange",
        source_id: null,
        reference_number: numeroOperacion,
        description:
          `${descripcionBase}. Contrapartida DOP por ${montoDivisa.toFixed(2)} ${monedaExtranjera.code}.`,
        payment_method: formularioOperacion.payment_method,
        status: "posted",
      },
    ];

    setGuardandoOperacion(true);

    const resultado = await supabase
      .from("cash_movements")
      .insert(movimientosCambio);

    if (resultado.error) {
      setMensajeError(
        "No se pudo registrar el cambio de divisas: " +
          resultado.error.message,
      );
      setGuardandoOperacion(false);
      return;
    }

    await cargarMovimientos();

    setMensajeExito(
      `Cambio registrado correctamente. ${montoDivisa.toFixed(2)} ${monedaExtranjera.code} equivalen a RD$ ${montoDop.toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}. Referencia: ${numeroOperacion}`,
    );

    setFormularioOperacion({
      ...formularioInicial,
      foreign_currency_code: monedaExtranjera.code,
      exchange_type: formularioOperacion.exchange_type,
      payment_method: formularioOperacion.payment_method,
    });
    setGuardandoOperacion(false);
  }

  async function registrarCambioCheque() {
    const montoCheque = Number(formularioOperacion.check_amount);
    const porcentajeComision = Number(
      formularioOperacion.check_fee_percent,
    );

    if (!Number.isFinite(montoCheque) || montoCheque <= 0) {
      setMensajeError(
        "El monto del cheque debe ser mayor que cero.",
      );
      return;
    }

    if (
      !Number.isFinite(porcentajeComision) ||
      porcentajeComision < 0 ||
      porcentajeComision >= 100
    ) {
      setMensajeError(
        "El porcentaje de comisión debe estar entre 0 y menos de 100.",
      );
      return;
    }

    if (formularioOperacion.check_bank === "") {
      setMensajeError("Debes seleccionar el banco del cheque.");
      return;
    }

    if (formularioOperacion.check_number.trim() === "") {
      setMensajeError("Debes escribir el número del cheque.");
      return;
    }

    const monedaDop = obtenerMonedaPorCodigo("DOP");
    const organizationId = obtenerOrganizationId();

    if (!monedaDop) {
      setMensajeError(
        "Debe existir la moneda DOP en la tabla currencies.",
      );
      return;
    }

    if (!organizationId) {
      setMensajeError(
        "No se pudo determinar la organización. Debe existir al menos un movimiento de caja previo.",
      );
      return;
    }

    const comision = Number(
      ((montoCheque * porcentajeComision) / 100).toFixed(2),
    );
    const montoEntregado = Number(
      (montoCheque - comision).toFixed(2),
    );

    if (montoEntregado <= 0) {
      setMensajeError(
        "El monto a entregar debe ser mayor que cero.",
      );
      return;
    }

    const numeroOperacion =
      formularioOperacion.reference_number.trim() ||
      `CHQ-${generarNumeroOperacion().replace("CAJ-", "")}`;
    const fechaOperacion = new Date().toISOString();
    const bancoTexto = obtenerTextoBancoCheque(
      formularioOperacion.check_bank,
    );
    const titular =
      formularioOperacion.check_holder.trim() || null;
    const fechaCheque =
      formularioOperacion.check_date || null;
    const observacion =
      formularioOperacion.description.trim() || null;

    setGuardandoOperacion(true);

    const usuarioResultado = await supabase.auth.getUser();
    const usuarioId =
      usuarioResultado.data.user?.id ?? null;

    const chequeResultado = await supabase
      .from("checks_receivable")
      .insert({
        organization_id: organizationId,
        currency_id: monedaDop.id,
        internal_reference: numeroOperacion,
        bank: bancoTexto,
        other_bank:
          formularioOperacion.check_bank === "other"
            ? "Otro"
            : null,
        check_number:
          formularioOperacion.check_number.trim(),
        drawer_name: titular,
        beneficiary_name: null,
        check_date: fechaCheque,
        due_date: null,
        gross_amount: montoCheque,
        commission_rate: porcentajeComision,
        commission_amount: comision,
        net_amount: montoEntregado,
        status: "pending",
        notes: observacion,
        created_by: usuarioId,
      })
      .select("id")
      .single();

    if (chequeResultado.error) {
      setMensajeError(
        "No se pudo guardar el cheque pendiente: " +
          chequeResultado.error.message,
      );
      setGuardandoOperacion(false);
      return;
    }

    const movimientoResultado = await supabase
      .from("cash_movements")
      .insert({
        organization_id: organizationId,
        currency_id: monedaDop.id,
        movement_date: fechaOperacion,
        movement_type: "check_exchange",
        direction: "expense",
        amount: montoEntregado,
        source_type: "checks_receivable",
        source_id: chequeResultado.data.id,
        reference_number: numeroOperacion,
        description:
          `Efectivo entregado por cambio de cheque No. ${formularioOperacion.check_number.trim()} ` +
          `del ${bancoTexto}. Monto bruto: RD$ ${montoCheque.toFixed(2)}. ` +
          `Comisión retenida: RD$ ${comision.toFixed(2)}. ` +
          `Cheque registrado como pendiente de cobro.` +
          (observacion ? ` Observación: ${observacion}` : ""),
        payment_method: "cash",
        status: "posted",
        created_by: usuarioId,
      });

    if (movimientoResultado.error) {
      await supabase
        .from("checks_receivable")
        .delete()
        .eq("id", chequeResultado.data.id);

      setMensajeError(
        "El cheque no pudo completar su registro en caja: " +
          movimientoResultado.error.message,
      );
      setGuardandoOperacion(false);
      return;
    }

    await cargarMovimientos();

    setMensajeExito(
      `Cheque guardado como pendiente de cobro. Monto: RD$ ${montoCheque.toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}. Comisión: RD$ ${comision.toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}. Efectivo entregado: RD$ ${montoEntregado.toLocaleString("es-DO", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}. Referencia: ${numeroOperacion}`,
    );

    setFormularioOperacion({
      ...formularioInicial,
      check_fee_percent:
        formularioOperacion.check_fee_percent,
      check_bank: formularioOperacion.check_bank,
      payment_method: "cash",
    });
    setGuardandoOperacion(false);
  }

  function obtenerTextoBancoCheque(banco: string) {
    if (banco === "popular") return "Banco Popular";
    if (banco === "banreservas") return "Banreservas";
    if (banco === "bhd") return "BHD";
    if (banco === "coopvega_real") return "Coopvega Real";
    if (banco === "santacruz") return "Banco Santa Cruz";
    if (banco === "alaver") return "Alaver";
    if (banco === "scotiabank") return "Scotiabank";
    return "Otro";
  }

  async function registrarOperacion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensajeError("");
    setMensajeExito("");

    if (modoOperacion === "currency_exchange") {
      await registrarCambioDivisas();
      return;
    }

    if (modoOperacion === "check_exchange") {
      await registrarCambioCheque();
      return;
    }

    const monto = Number(formularioOperacion.amount);

    if (formularioOperacion.direction === "") {
      setMensajeError("Debes seleccionar Entrada o Salida.");
      return;
    }

    if (formularioOperacion.currency_code === "") {
      setMensajeError("Debes seleccionar una moneda.");
      return;
    }

    if (!Number.isFinite(monto) || monto <= 0) {
      setMensajeError("El monto debe ser mayor que cero.");
      return;
    }

    if (formularioOperacion.category === "") {
      setMensajeError("Debes seleccionar una categoría.");
      return;
    }

    if (formularioOperacion.description.trim() === "") {
      setMensajeError("Debes escribir una descripción u observación.");
      return;
    }

    const monedaSeleccionada = monedasDisponibles.find(
      function buscarMoneda(moneda) {
        return moneda.code === formularioOperacion.currency_code;
      },
    );

    if (!monedaSeleccionada) {
      setMensajeError("No se encontró la moneda seleccionada.");
      return;
    }

    const organizationId = obtenerOrganizationId();

    if (!organizationId) {
      setMensajeError(
        "No se pudo determinar la organización. Debe existir al menos un movimiento de caja previo.",
      );
      return;
    }

    setGuardandoOperacion(true);

    const numeroOperacion =
      formularioOperacion.reference_number.trim() || generarNumeroOperacion();

    const resultado = await supabase.from("cash_movements").insert({
      organization_id: organizationId,
      currency_id: monedaSeleccionada.id,
      movement_date: new Date().toISOString(),
      movement_type: obtenerTipoMovimientoManual(
        formularioOperacion.category,
        formularioOperacion.direction,
      ),
      direction: formularioOperacion.direction,
      amount: monto,
      source_type: "manual_cash_operation",
      source_id: null,
      reference_number: numeroOperacion,
      description: formularioOperacion.description.trim(),
      payment_method: formularioOperacion.payment_method,
      status: "posted",
    });

    if (resultado.error) {
      setMensajeError(
        "No se pudo registrar la operación: " + resultado.error.message,
      );
      setGuardandoOperacion(false);
      return;
    }

    await cargarMovimientos();

    setMensajeExito(
      `Operación registrada correctamente. Referencia: ${numeroOperacion}`,
    );
    setFormularioOperacion({
      ...formularioInicial,
      currency_code: monedaSeleccionada.code,
    });
    setGuardandoOperacion(false);
  }

  function formatearMonto(monto: number, moneda: Moneda | null) {
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

  function formatearMontoResumen(monto: number, simbolo: string) {
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
    if (tipo === "currency_exchange") return "Cambio de divisas";
    if (tipo === "check_exchange") return "Cambio de cheque";
    if (tipo === "adjustment") return "Ajuste de caja";
    return "Ajuste";
  }

  function obtenerTextoMetodo(metodo: string) {
    if (metodo === "cash") return "Efectivo";
    if (metodo === "transfer") return "Transferencia";
    if (metodo === "deposit") return "Depósito";
    if (metodo === "check") return "Cheque";
    if (metodo === "card_withdrawal") return "Retiro con tarjeta";
    return "Otro";
  }

  const totalCambioDop =
    Number(formularioOperacion.foreign_amount || 0) *
    Number(formularioOperacion.exchange_rate || 0);

  const montoChequeCalculado = Number(
    formularioOperacion.check_amount || 0,
  );
  const porcentajeChequeCalculado = Number(
    formularioOperacion.check_fee_percent || 0,
  );
  const comisionChequeCalculada =
    (montoChequeCalculado * porcentajeChequeCalculado) / 100;
  const netoChequeCalculado =
    montoChequeCalculado - comisionChequeCalculada;

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900">Caja</h1>
            <p className="mt-2 text-gray-600">
              Consulta entradas, salidas y balances por moneda
            </p>
          </div>

          <button
            type="button"
            onClick={abrirModalOperacion}
            className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white shadow hover:bg-blue-800"
          >
            + Nueva operación
          </button>
        </div>

        {mensajeError !== "" && !modalOperacionAbierto && (
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
                <p className="text-gray-500">Cargando resumen...</p>
              </div>
            ) : resumenPorMoneda.length === 0 ? (
              <div className="rounded-xl bg-white p-6 shadow">
                <p className="text-gray-500">
                  Todavía no hay movimientos de caja.
                </p>
              </div>
            ) : (
              resumenPorMoneda.map(function mostrarResumen(resumen) {
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
                        <span className="text-sm text-gray-600">Entradas</span>
                        <span className="font-medium text-green-700">
                          {formatearMontoResumen(
                            resumen.ingresos,
                            resumen.symbol,
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Salidas</span>
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
                onChange={(event) => setFiltroMoneda(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
              >
                <option value="all">Todas las monedas</option>
                {monedasDisponibles.map((moneda) => (
                  <option key={moneda.code} value={moneda.code}>
                    {moneda.code}
                  </option>
                ))}
              </select>

              <select
                value={filtroDireccion}
                onChange={(event) => setFiltroDireccion(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
              >
                <option value="all">Entradas y salidas</option>
                <option value="income">Solo entradas</option>
                <option value="expense">Solo salidas</option>
              </select>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Fecha",
                    "Tipo",
                    "Dirección",
                    "Monto",
                    "Método",
                    "Referencia",
                    "Descripción",
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
                  movimientosFiltrados.map((movimiento) => (
                    <tr key={movimiento.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearFecha(movimiento.movement_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {obtenerTextoTipo(movimiento.movement_type)}
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
                        {obtenerTextoMetodo(movimiento.payment_method)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {movimiento.reference_number || "—"}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {movimiento.description || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalOperacionAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Nueva operación de caja
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Registra movimientos manuales, cambios de divisas o cambios de cheques.
                </p>
              </div>

              <button
                type="button"
                onClick={cerrarModalOperacion}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {mensajeError !== "" && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {mensajeError}
              </div>
            )}

            {mensajeExito !== "" && (
              <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                {mensajeExito}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-2 rounded-xl bg-slate-100 p-1 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => {
                  setModoOperacion("manual");
                  setMensajeError("");
                  setMensajeExito("");
                }}
                className={
                  modoOperacion === "manual"
                    ? "rounded-lg bg-white px-4 py-3 font-semibold text-blue-900 shadow"
                    : "rounded-lg px-4 py-3 font-semibold text-gray-600 hover:text-blue-900"
                }
              >
                Entrada / salida
              </button>

              <button
                type="button"
                onClick={() => {
                  setModoOperacion("currency_exchange");
                  setMensajeError("");
                  setMensajeExito("");
                }}
                className={
                  modoOperacion === "currency_exchange"
                    ? "rounded-lg bg-white px-4 py-3 font-semibold text-blue-900 shadow"
                    : "rounded-lg px-4 py-3 font-semibold text-gray-600 hover:text-blue-900"
                }
              >
                Cambio de divisas
              </button>

              <button
                type="button"
                onClick={() => {
                  setModoOperacion("check_exchange");
                  setMensajeError("");
                  setMensajeExito("");
                }}
                className={
                  modoOperacion === "check_exchange"
                    ? "rounded-lg bg-white px-4 py-3 font-semibold text-blue-900 shadow"
                    : "rounded-lg px-4 py-3 font-semibold text-gray-600 hover:text-blue-900"
                }
              >
                Cambio de cheques
              </button>
            </div>

            <form onSubmit={registrarOperacion} className="mt-6 space-y-5">
              {modoOperacion === "manual" ? (
                <>
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Tipo de operación
                  </span>
                  <select
                    value={formularioOperacion.direction}
                    onChange={(event) =>
                      setFormularioOperacion({
                        ...formularioOperacion,
                        direction: event.target.value as TipoOperacion | "",
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                  >
                    <option value="">Seleccionar</option>
                    <option value="income">Entrada</option>
                    <option value="expense">Salida</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Moneda
                  </span>
                  <select
                    value={formularioOperacion.currency_code}
                    onChange={(event) =>
                      setFormularioOperacion({
                        ...formularioOperacion,
                        currency_code: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                  >
                    <option value="">Seleccionar</option>
                    {monedasDisponibles.map((moneda) => (
                      <option key={moneda.code} value={moneda.code}>
                        {moneda.code} ({moneda.symbol})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Monto
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formularioOperacion.amount}
                    onChange={(event) =>
                      setFormularioOperacion({
                        ...formularioOperacion,
                        amount: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                    placeholder="0.00"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Categoría
                  </span>
                  <select
                    value={formularioOperacion.category}
                    onChange={(event) =>
                      setFormularioOperacion({
                        ...formularioOperacion,
                        category: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                  >
                    <option value="">Seleccionar</option>
                    <option value="owner_contribution">
                      Aporte del propietario
                    </option>
                    <option value="operating_income">Ingreso operativo</option>
                    <option value="expense">Gasto</option>
                    <option value="payroll">Nómina</option>
                    <option value="bank_deposit">Depósito bancario</option>
                    <option value="owner_withdrawal">
                      Retiro del propietario
                    </option>
                    <option value="cash_adjustment">Ajuste de caja</option>
                    <option value="other">Otro</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Método de pago
                  </span>
                  <select
                    value={formularioOperacion.payment_method}
                    onChange={(event) =>
                      setFormularioOperacion({
                        ...formularioOperacion,
                        payment_method: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="deposit">Depósito</option>
                    <option value="check">Cheque</option>
                    <option value="card_withdrawal">Retiro con tarjeta</option>
                    <option value="other">Otro</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Número de referencia
                  </span>
                  <input
                    type="text"
                    value={formularioOperacion.reference_number}
                    onChange={(event) =>
                      setFormularioOperacion({
                        ...formularioOperacion,
                        reference_number: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                    placeholder="Opcional"
                  />
                </label>
              </div>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Descripción u observaciones
                    </span>
                    <textarea
                      rows={4}
                      value={formularioOperacion.description}
                      onChange={(event) =>
                        setFormularioOperacion({
                          ...formularioOperacion,
                          description: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                      placeholder="Explica el motivo de la operación"
                    />
                  </label>
                </>
              ) : modoOperacion === "currency_exchange" ? (
                <>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                    Al comprar una divisa, el sistema registra una entrada en la moneda extranjera y una salida equivalente en DOP. Al venderla, registra lo contrario.
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Operación
                      </span>
                      <select
                        value={formularioOperacion.exchange_type}
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            exchange_type: event.target
                              .value as TipoCambioDivisa,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                      >
                        <option value="buy_foreign">
                          Comprar divisa
                        </option>
                        <option value="sell_foreign">
                          Vender divisa
                        </option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Divisa
                      </span>
                      <select
                        value={
                          formularioOperacion.foreign_currency_code
                        }
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            foreign_currency_code:
                              event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                      >
                        <option value="">Seleccionar</option>
                        {monedasDisponibles
                          .filter(
                            (moneda) => moneda.code !== "DOP",
                          )
                          .map((moneda) => (
                            <option
                              key={moneda.code}
                              value={moneda.code}
                            >
                              {moneda.code} ({moneda.symbol})
                            </option>
                          ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Monto de la divisa
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formularioOperacion.foreign_amount}
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            foreign_amount: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                        placeholder="0.00"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Tasa DOP por 1 unidad
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={formularioOperacion.exchange_rate}
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            exchange_rate: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                        placeholder="Ejemplo: 61.5000"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Método
                      </span>
                      <select
                        value={formularioOperacion.payment_method}
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            payment_method: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                      >
                        <option value="cash">Efectivo</option>
                        <option value="transfer">
                          Transferencia
                        </option>
                        <option value="deposit">Depósito</option>
                        <option value="check">Cheque</option>
                        <option value="other">Otro</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Referencia
                      </span>
                      <input
                        type="text"
                        value={
                          formularioOperacion.reference_number
                        }
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            reference_number: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                        placeholder="Opcional"
                      />
                    </label>
                  </div>

                  <div className="rounded-xl bg-slate-100 p-4">
                    <p className="text-sm text-gray-600">
                      Equivalente en pesos dominicanos
                    </p>
                    <p className="mt-1 text-2xl font-bold text-blue-900">
                      RD$ {Number.isFinite(totalCambioDop)
                        ? totalCambioDop.toLocaleString("es-DO", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : "0.00"}
                    </p>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Descripción u observaciones
                    </span>
                    <textarea
                      rows={3}
                      value={formularioOperacion.description}
                      onChange={(event) =>
                        setFormularioOperacion({
                          ...formularioOperacion,
                          description: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                      placeholder="Opcional"
                    />
                  </label>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    El cheque se guardará como una cuenta por cobrar pendiente. En Caja solo se registrará la salida del efectivo neto entregado. La comisión quedará guardada dentro de la operación del cheque.
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Banco
                      </span>
                      <select
                        value={formularioOperacion.check_bank}
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            check_bank: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3 outline-none focus:border-blue-700"
                      >
                        <option value="popular">Banco Popular</option>
                        <option value="banreservas">Banreservas</option>
                        <option value="bhd">BHD</option>
                        <option value="coopvega_real">Coopvega Real</option>
                        <option value="santacruz">Banco Santa Cruz</option>
                        <option value="alaver">Alaver</option>
                        <option value="scotiabank">Scotiabank</option>
                        <option value="other">Otro</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Número del cheque
                      </span>
                      <input
                        type="text"
                        value={formularioOperacion.check_number}
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            check_number: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                        placeholder="Obligatorio"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Monto del cheque
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formularioOperacion.check_amount}
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            check_amount: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                        placeholder="0.00"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Comisión (%)
                      </span>
                      <input
                        type="number"
                        min="0"
                        max="99.99"
                        step="0.01"
                        value={formularioOperacion.check_fee_percent}
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            check_fee_percent: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                        placeholder="2.00"
                      />
                      <span className="mt-1 block text-xs text-gray-500">
                        Puedes reducirla para cheques de montos altos.
                      </span>
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Titular o beneficiario
                      </span>
                      <input
                        type="text"
                        value={formularioOperacion.check_holder}
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            check_holder: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                        placeholder="Opcional"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">
                        Fecha del cheque
                      </span>
                      <input
                        type="date"
                        value={formularioOperacion.check_date}
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            check_date: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                      />
                    </label>

                    <label className="block sm:col-span-2">
                      <span className="text-sm font-medium text-gray-700">
                        Referencia interna
                      </span>
                      <input
                        type="text"
                        value={formularioOperacion.reference_number}
                        onChange={(event) =>
                          setFormularioOperacion({
                            ...formularioOperacion,
                            reference_number: event.target.value,
                          })
                        }
                        className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                        placeholder="Opcional; se generará automáticamente"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-xl bg-slate-100 p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-gray-600">Monto del cheque</p>
                      <p className="mt-1 text-lg font-bold text-blue-900">
                        RD$ {Number.isFinite(montoChequeCalculado)
                          ? montoChequeCalculado.toLocaleString("es-DO", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Comisión</p>
                      <p className="mt-1 text-lg font-bold text-green-700">
                        RD$ {Number.isFinite(comisionChequeCalculada)
                          ? comisionChequeCalculada.toLocaleString("es-DO", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "0.00"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Efectivo a entregar</p>
                      <p className="mt-1 text-lg font-bold text-red-700">
                        RD$ {Number.isFinite(netoChequeCalculado)
                          ? Math.max(0, netoChequeCalculado).toLocaleString("es-DO", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : "0.00"}
                      </p>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-sm font-medium text-gray-700">
                      Descripción u observaciones
                    </span>
                    <textarea
                      rows={3}
                      value={formularioOperacion.description}
                      onChange={(event) =>
                        setFormularioOperacion({
                          ...formularioOperacion,
                          description: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-700"
                      placeholder="Opcional"
                    />
                  </label>
                </>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={cerrarModalOperacion}
                  className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardandoOperacion}
                  className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardandoOperacion
                    ? "Registrando..."
                    : modoOperacion === "currency_exchange"
                      ? "Registrar cambio"
                      : modoOperacion === "check_exchange"
                        ? "Registrar cheque"
                        : "Registrar operación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
