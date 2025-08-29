/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  type WebsiteListInterface,
  type WebsiteListWithStatusInterface,
} from "./data/website";

const backend = import.meta.env.VITE_BACKEND_URL;

// === Badge 3 warna (mode dari map terpisah) ===
const ClientBadge: React.FC<{ mode: "online" | "protected" | "offline" }> = ({
  mode,
}) => {
  const m =
    mode === "online"
      ? { cls: "bg-green-100 text-green-700", label: "Online" }
      : mode === "protected"
      ? { cls: "bg-amber-100 text-amber-700", label: "Online – Protected" }
      : { cls: "bg-red-100 text-red-700", label: "Offline" };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.cls}`}>
      {m.label}
    </span>
  );
};

const ServerBadge: React.FC<{ status: boolean }> = ({ status }) => (
  <span
    className={`px-2 py-1 rounded-full text-xs font-medium ${
      status ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}
  >
    {status ? "Online" : "Offline"}
  </span>
);

// helper: klasifikasikan status dari response/error backend /check
function classifyClientStatus(
  res?: { status: number; data?: any },
  err?: any
): { bool: boolean; mode: "online" | "protected" | "offline" } {
  const fromVal = (v: any) => {
    if (typeof v === "boolean") {
      return v ? { bool: true, mode: "online" as const } : { bool: false, mode: "offline" as const };
    }
    if (typeof v === "string") {
      const s = v.toUpperCase();
      if (s === "ONLINE") return { bool: true, mode: "online" as const };
      if (s === "ONLINE_PROTECTED") return { bool: true, mode: "protected" as const };
      if (s === "OFFLINE") return { bool: false, mode: "offline" as const };
    }
    return null;
  };

  // jika ada body status yang eksplisit
  const v1 =
    res?.data?.status ??
    (typeof res?.data === "string" ? res?.data : undefined) ??
    err?.response?.data?.status ??
    (typeof err?.response?.data === "string" ? err?.response?.data : undefined);
  const parsed = fromVal(v1);
  if (parsed) return parsed;

  // fallback pakai HTTP status dari /check
  const code = res?.status ?? err?.response?.status ?? 0;
  if (code >= 200 && code < 400) return { bool: true, mode: "online" };
  if (code === 403 || code === 503) return { bool: true, mode: "protected" };
  return { bool: false, mode: "offline" };
}

function App() {
  const [table, setTable] = useState<Array<WebsiteListWithStatusInterface>>([]);
  const [clientModeMap, setClientModeMap] = useState<
    Record<string, "online" | "protected" | "offline">
  >({});
  const [serverName, setServerName] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");
  const [data, setData] = useState<Array<WebsiteListInterface>>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const response = await axios.get(`${backend}/get-data-client`);
      setData(response.data.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setData([]);
    }
  };

  const filteredList = useMemo(() => {
    const byServer =
      serverName === "ALL"
        ? data
        : data.filter((w) => w.server_location === serverName);

    if (!search.trim()) return byServer;

    const q = search.toLowerCase();
    return byServer.filter(
      (site) =>
        site.program_name.toLowerCase().includes(q) ||
        site.domain_name.toLowerCase().includes(q) ||
        site.server_location.toLowerCase().includes(q)
    );
  }, [data, serverName, search]);

  const getStatus = async () => {
    setLoading(true);
    setTable([]);
    setClientModeMap({});

    const results = await Promise.allSettled(
      filteredList.map(async (website) => {
        // --- Client Status via backend /check ---
        let clientResult: { bool: boolean; mode: "online" | "protected" | "offline" } = {
          bool: false,
          mode: "offline",
        };

        if (website.domain_name?.length) {
          try {
            const res = await axios.get(`${backend}/check`, {
              params: { url: website.domain_name },
              timeout: 9000,
              validateStatus: () => true, // jangan throw utk 403/503
            });
            clientResult = classifyClientStatus({ status: res.status, data: res.data });
          } catch (err: any) {
            clientResult = classifyClientStatus(undefined, err);
          }
        }

        // --- Server Status (origin/backend) ---
        let status_server_bool = false;
        if (website.backend_url?.length) {
          try {
            const head = await axios.head(website.backend_url, {
              timeout: 6000,
              validateStatus: () => true,
            });
            status_server_bool = head.status >= 200 && head.status < 400;

            if (!status_server_bool) {
              const get = await axios.get(website.backend_url, {
                timeout: 9000,
                validateStatus: () => true,
              });
              status_server_bool = get.status >= 200 && get.status < 400;
            }
          } catch {
            status_server_bool = false;
          }
        }

        // simpan mode untuk rendering badge kuning/merah/hijau (key pakai domain_name unik)
        // tidak mengubah interface
        return {
          row: {
            server_location: website.server_location,
            domain_name: website.domain_name,
            program_name: website.program_name,
            status_client: clientResult.bool, // boolean utk kompatibilitas
            backend_url: website.backend_url,
            status_server: status_server_bool,
          } as WebsiteListWithStatusInterface,
          mode: clientResult.mode,
        };
      })
    );

    const tableData: Array<WebsiteListWithStatusInterface> = [];
    const modeMap: Record<string, "online" | "protected" | "offline"> = {};

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) {
        tableData.push(r.value.row);
        modeMap[r.value.row.domain_name] = r.value.mode;
      }
    });

    setTable(tableData);
    setClientModeMap(modeMap);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (data.length > 0) getStatus();
  }, [data]);

  useEffect(() => {
    if (data.length > 0) getStatus();
  }, [serverName]);

  return (
    <>
      <h1 className="text-center m-3 text-5xl font-bold">Domain Checker</h1>

      <div className="w-auto m-5 p-3 rounded bg-amber-200 flex-col">
        <h4 className="font-bold mb-3">Filter :</h4>
        <div className="w-auto flex flex-wrap gap-4">
          <div className="w-auto flex flex-col">
            <label className="mb-1 font-bold">Select Server</label>
            <select
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              className="bg-white rounded p-3 w-56"
            >
              <option value="ALL">All</option>
              <option value="biznet-1">Biznet 1</option>
              <option value="biznet-2">Biznet 2</option>
              <option value="backup-server">Backup Server</option>
              <option value="nevacloud-dev">Nevacloud Dev</option>
              <option value="nevacloud-2">Nevacloud 2</option>
              <option value="nevacloud-3">Nevacloud 3</option>
            </select>
          </div>

          <div className="w-auto flex flex-col">
            <label className="mb-1 font-bold">Search</label>
            <input
              placeholder="Search"
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white p-3 rounded w-80"
            />
          </div>

          <div className="flex items-end">
            <button onClick={getStatus} className="m-0 p-3 bg-white rounded border">
              {loading ? "Checking..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto m-5">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2 text-left">Server Location</th>
              <th className="border px-4 py-2 text-left">Program Name</th>
              <th className="border px-4 py-2 text-left">Domain Name</th>
              <th className="border px-4 py-2 text-left">Client Status</th>
              <th className="border px-4 py-2 text-left">Backend URL</th>
              <th className="border px-4 py-2 text-left">Server Status</th>
            </tr>
          </thead>
          <tbody>
            {table
              .filter((site) => {
                const q = search.toLowerCase();
                return (
                  !q ||
                  site.program_name.toLowerCase().includes(q) ||
                  site.domain_name.toLowerCase().includes(q) ||
                  site.server_location.toLowerCase().includes(q)
                );
              })
              .map((site, index) => {
                const mode =
                  clientModeMap[site.domain_name] ??
                  (site.status_client ? "online" : "offline");
                return (
                  <tr key={`${site.program_name}-${index}`} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{site.server_location}</td>
                    <td className="border px-4 py-2">{site.program_name}</td>
                    <td className="border px-4 py-2">{site.domain_name}</td>
                    <td className="border px-4 py-2">
                      <ClientBadge mode={mode} />
                    </td>
                    <td className="border px-4 py-2">
                      {site.backend_url?.split("/api")[0] || "-"}
                    </td>
                    <td className="border px-4 py-2">
                      <ServerBadge status={site.status_server} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>

        {table.length === 0 && !loading && (
          <div className="text-center text-gray-500 p-6">Tidak ada data.</div>
        )}
      </div>
    </>
  );
}

export default App;