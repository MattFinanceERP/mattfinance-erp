"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PermissionGuard } from "../components/PermissionGuard";
import { createClient } from "../lib/supabase";

type Auditoria = {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  table_name: string;
  record_id: string | null;
  action_type: "insert" | "update" | "delete";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: Record<
    string,
    {
      old: unknown;
      new: unknown;
    }
  > | null;
  created_at: string;
};

type Filtros = {
  tabla: string;
  accion: string;
  desde: string;
  hasta: string;
  busqueda: string;
};

const filtrosIniciales: Filtros = {
  tabla: "all",
  accion: "all",
  desde: "",
  hasta: "",
  busqueda: "",
};

export default function AuditoriaPage() {
  return (
    <PermissionGuard permission="audit.view">
      <AuditoriaContent />
    </PermissionGuard>
  );
}

function AuditoriaContent() {
  const supabase = useMemo(() => createClient(), []);

  const [registros, setRegistros] = useState<Auditoria[]>([]);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciales);
  const [seleccionado, setSeleccionado] = useState<Auditoria | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargarAuditoria = useCallback(async () => {
    setCargando(true);
    setError("");

    let consulta = supabase
      .from("audit_logs")
      .select(
        "id, organization_id, user_id, table_name, record_id, action_type, old_data, new_data, changed_fields, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (filtros.tabla !== "all") {
      consulta = consulta.eq("table_name", filtros.tabla);
    }

    if (filtros.accion !== "all") {
      consulta = consulta.eq("action_type", filtros.accion);
    }

    if (filtros.desde) {
      consulta = consulta.gte(
        "created_at",
        `${filtros.desde}T00:00:00`,
      );
    }

    if (filtros.hasta) {
      consulta = consulta.lte(
        "created_at",
        `${filtros.hasta}T23:59:59`,
      );
    }

    const resultado = await consulta;

    if (resultado.error) {
      setError(
        "No se pudo cargar la auditoría: " +
          resultado.error.message,
      );
      setRegistros([]);
    } else {
      setRegistros((resultado.data || []) as Auditoria[]);
    }

    setCargando(false);
  }, [
    filtros.accion,
    filtros.desde,
    filtros.hasta,
    filtros.tabla,
    supabase,
  ]);

  useEffect(() => {
    void cargarAuditoria();
  }, [cargarAuditoria]);

  const tablasDisponibles = useMemo(
    () =>
      Array.from(
        new Set(registros.map((registro) => registro.table_name)),
      ).sort(),
    [registros],
  );

  const registrosFiltrados = useMemo(() => {
    const termino = filtros.busqueda.trim().toLowerCase();

    if (!termino) return registros;

    return registros.filter((registro) => {
      const texto = [
        registro.table_name,
        registro.record_id || "",
        registro.user_id || "",
        JSON.stringify(registro.changed_fields || {}),
        JSON.stringify(registro.new_data || {}),
        JSON.stringify(registro.old_data || {}),
      ]
        .join(" ")
        .toLowerCase();

      return texto.includes(termino);
    });
  }, [filtros.busqueda, registros]);

  const resumen = useMemo(
    () => ({
      total: registrosFiltrados.length,
      inserciones: registrosFiltrados.filter(
        (registro) => registro.action_type === "insert",
      ).length,
      modificaciones: registrosFiltrados.filter(
        (registro) => registro.action_type === "update",
      ).length,
      eliminaciones: registrosFiltrados.filter(
        (registro) => registro.action_type === "delete",
      ).length,
    }),
    [registrosFiltrados],
  );

  function actualizarFiltro(
    campo: keyof Filtros,
    valor: string,
  ) {
    setFiltros((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  }

  function limpiarFiltros() {
    setFiltros(filtrosIniciales);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900">
              Auditoría
            </h1>
            <p className="mt-2 text-gray-600">
              Registro técnico de cambios realizados en MattFinance ERP.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void cargarAuditoria()}
            className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
          >
            Actualizar
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Resumen titulo="Total" valor={resumen.total} />
          <Resumen
            titulo="Creaciones"
            valor={resumen.inserciones}
          />
          <Resumen
            titulo="Modificaciones"
            valor={resumen.modificaciones}
          />
          <Resumen
            titulo="Eliminaciones"
            valor={resumen.eliminaciones}
          />
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="text-xl font-bold text-blue-900">
            Filtros
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <select
              value={filtros.tabla}
              onChange={(event) =>
                actualizarFiltro("tabla", event.target.value)
              }
              className="rounded-lg border border-gray-300 bg-white p-3"
            >
              <option value="all">Todas las tablas</option>
              {tablasDisponibles.map((tabla) => (
                <option key={tabla} value={tabla}>
                  {textoTabla(tabla)}
                </option>
              ))}
            </select>

            <select
              value={filtros.accion}
              onChange={(event) =>
                actualizarFiltro("accion", event.target.value)
              }
              className="rounded-lg border border-gray-300 bg-white p-3"
            >
              <option value="all">Todas las acciones</option>
              <option value="insert">Creaciones</option>
              <option value="update">Modificaciones</option>
              <option value="delete">Eliminaciones</option>
            </select>

            <input
              type="date"
              value={filtros.desde}
              onChange={(event) =>
                actualizarFiltro("desde", event.target.value)
              }
              className="rounded-lg border border-gray-300 p-3"
            />

            <input
              type="date"
              value={filtros.hasta}
              onChange={(event) =>
                actualizarFiltro("hasta", event.target.value)
              }
              className="rounded-lg border border-gray-300 p-3"
            />

            <input
              type="search"
              value={filtros.busqueda}
              onChange={(event) =>
                actualizarFiltro("busqueda", event.target.value)
              }
              placeholder="Buscar ID, usuario o cambio..."
              className="rounded-lg border border-gray-300 p-3"
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={limpiarFiltros}
              className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Limpiar filtros
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  {[
                    "Fecha",
                    "Tabla",
                    "Acción",
                    "Registro",
                    "Usuario",
                    "Cambios",
                    "Detalle",
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
                      Cargando auditoría...
                    </td>
                  </tr>
                ) : registrosFiltrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No hay registros para mostrar.
                    </td>
                  </tr>
                ) : (
                  registrosFiltrados.map((registro) => (
                    <tr key={registro.id}>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                        {formatearFechaHora(registro.created_at)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
                        {textoTabla(registro.table_name)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={claseAccion(
                            registro.action_type,
                          )}
                        >
                          {textoAccion(registro.action_type)}
                        </span>
                      </td>

                      <td className="max-w-xs break-all px-4 py-4 text-sm text-gray-700">
                        {registro.record_id || "—"}
                      </td>

                      <td className="max-w-xs break-all px-4 py-4 text-sm text-gray-700">
                        {registro.user_id || "Sistema"}
                      </td>

                      <td className="px-4 py-4 text-sm text-gray-700">
                        {cantidadCambios(registro)}
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => setSeleccionado(registro)}
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

      {seleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-900">
                  Detalle de auditoría
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {textoTabla(seleccionado.table_name)} ·{" "}
                  {textoAccion(seleccionado.action_type)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSeleccionado(null)}
                className="text-2xl text-gray-500 hover:text-gray-900"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Dato
                titulo="Fecha"
                valor={formatearFechaHora(
                  seleccionado.created_at,
                )}
              />
              <Dato
                titulo="Tabla"
                valor={textoTabla(seleccionado.table_name)}
              />
              <Dato
                titulo="Registro"
                valor={seleccionado.record_id || "—"}
              />
              <Dato
                titulo="Usuario"
                valor={seleccionado.user_id || "Sistema"}
              />
            </div>

            {seleccionado.action_type === "update" && (
              <section className="mt-6">
                <h3 className="text-lg font-bold text-blue-900">
                  Campos modificados
                </h3>

                <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                          Campo
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                          Valor anterior
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
                          Valor nuevo
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200">
                      {Object.entries(
                        seleccionado.changed_fields || {},
                      ).map(([campo, cambio]) => (
                        <tr key={campo}>
                          <td className="px-4 py-4 text-sm font-semibold text-gray-900">
                            {textoCampo(campo)}
                          </td>
                          <td className="px-4 py-4 text-sm text-red-700">
                            {formatearValor(cambio.old)}
                          </td>
                          <td className="px-4 py-4 text-sm text-green-700">
                            {formatearValor(cambio.new)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <JsonPanel
                titulo="Datos anteriores"
                datos={seleccionado.old_data}
              />
              <JsonPanel
                titulo="Datos nuevos"
                datos={seleccionado.new_data}
              />
            </section>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSeleccionado(null)}
                className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Resumen({
  titulo,
  valor,
}: {
  titulo: string;
  valor: number;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <p className="text-sm font-medium text-gray-600">
        {titulo}
      </p>
      <p className="mt-2 text-3xl font-bold text-blue-900">
        {valor}
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
      <p className="mt-1 break-all font-medium text-gray-900">
        {valor}
      </p>
    </div>
  );
}

function JsonPanel({
  titulo,
  datos,
}: {
  titulo: string;
  datos: Record<string, unknown> | null;
}) {
  return (
    <div>
      <h3 className="text-lg font-bold text-blue-900">
        {titulo}
      </h3>
      <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
        {datos
          ? JSON.stringify(datos, null, 2)
          : "Sin información"}
      </pre>
    </div>
  );
}

function textoAccion(accion: string) {
  if (accion === "insert") return "Creación";
  if (accion === "update") return "Modificación";
  if (accion === "delete") return "Eliminación";
  return accion;
}

function claseAccion(accion: string) {
  const base =
    "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ";

  if (accion === "insert") {
    return base + "bg-green-100 text-green-800";
  }

  if (accion === "update") {
    return base + "bg-amber-100 text-amber-800";
  }

  return base + "bg-red-100 text-red-800";
}

function cantidadCambios(registro: Auditoria) {
  if (registro.action_type === "insert") return "Registro creado";
  if (registro.action_type === "delete") return "Registro eliminado";

  const cantidad = Object.keys(
    registro.changed_fields || {},
  ).length;

  return `${cantidad} campo(s)`;
}

function formatearFechaHora(fecha: string) {
  return new Date(fecha).toLocaleString("es-DO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatearValor(valor: unknown) {
  if (valor === null || valor === undefined) return "—";

  if (typeof valor === "object") {
    return JSON.stringify(valor);
  }

  if (typeof valor === "boolean") {
    return valor ? "Sí" : "No";
  }

  return String(valor);
}

function textoTabla(tabla: string) {
  const tablas: Record<string, string> = {
    clients: "Clientes",
    loans: "Préstamos",
    loan_payments: "Pagos",
    loan_installments: "Cuotas",
    loan_card_details: "Tarjetas",
    card_collection_transactions: "Retiros de tarjetas",
    card_closures: "Cierres de tarjetas",
    client_surplus_balances: "Sobrantes",
    loan_collaterals: "Garantías",
    collateral_sales: "Ventas de garantías",
    cash_movements: "Caja",
  };

  return tablas[tabla] || tabla;
}

function textoCampo(campo: string) {
  return campo
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

