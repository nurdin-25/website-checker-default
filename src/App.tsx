/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  type WebsiteListInterface,
  type WebsiteListWithStatusInterface,
} from "./data/website";

const backend = import.meta.env.VITE_BACKEND_URL;

// tipe status fleksibel (boolean lama / string baru)
type ClientStatus = boolean | "ONLINE" | "ONLINE_PROTECTED" | "OFFLINE";

const StatusBadge: React.FC<{ status: ClientStatus }> = ({ status }) => {
  // normalisasi
  const normalized =
    typeof status === "boolean"
      ? status
        ? "ONLINE"
        : "OFFLINE"
      : status;

  const palette =
    normalized === "ONLINE"
      ? { cls: "bg-green-100 text-green-700", label: "Online" }
      : normalized === "ONLINE_PROTECTED"
      ? { cls: "bg-amber-100 text-amber-700", label: "Online – Protected" }
      : { cls: "bg-red-100 text-red-700", label: "Offline" };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${palette.cls}`}>
      {palette.label}
    </span>
  );
};

function App() {
  const [table, setTable] = useState<Array<WebsiteListWithStatusInterface>>([]);
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

  const normalizeClientStatus = (status: any): ClientStatus => {
    // dukung backend lama & baru
    if (typeof status === "boolean") return status;
    if (typeof status === "string") {
      const s = status.toUpperCase();
      if (s === "ONLINE" || s === "ONLINE_PROTECTED" || s === "OFFLINE") return s as ClientStatus;
    }
    // fallback: anggap offline
    return "OFFLINE";
  };

  const getStatus = async () => {
    setLoading(true);
    // kosongkan tabel saat refresh
    setTable([]);

    const results = await Promise.allSettled(
      filteredList.map(async (website) => {
        // 1) status client (via backend checker)
        let status_client: ClientStatus = "OFFLINE";
        if (website.domain_name?.length) {
          try {
            const res = await axios.get(`${backend}/check`, {
              params: { url: website.domain_name },
              timeout: 8000,
            });
            status_client = normalizeClientStatus(res.data?.status);
          } catch (_e) {
            status_client = "OFFLINE";
          }
        }

        // 2) status server (origin/backend)
        // gunakan HEAD (lebih ringan), fallback GET
        let status_server_bool = false;
        if (website.backend_url?.length) {
          try {
            const head = await axios.head(website.backend_url, { timeout: 6000 });
            status_server_bool = head.status >= 200 && head.status < 400;
          } catch (_e1) {
            try {
              const get = await axios.get(website.backend_url, {
                timeout: 8000,
                validateStatus: () => true,
              });
              status_server_bool = get.status >= 200 && get.status < 400;
            } catch (_e2) {
              status_server_bool = false;
            }
          }
        }

        const row: WebsiteListWithStatusInterface = {
          server_location: website.server_location,
          domain_name: website.domain_name,
          program_name: website.program_name,
          status_client,
          backend_url: website.backend_url,
          status_server: status_server_bool,
        };
        return row;
      })
    );

    const tableData: Array<WebsiteListWithStatusInterface> = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((v): v is WebsiteListWithStatusInterface => v !== null);

    setTable(tableData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // otomatis cek saat data pertama kali ada
  useEffect(() => {
    if (data.length > 0) getStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // jika filter server berubah, refresh hasil
  useEffect(() => {
    if (data.length > 0) getStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              .map((site, index) => (
                <tr key={`${site.program_name}-${index}`} className="hover:bg-gray-50">
                  <td className="border px-4 py-2">{site.server_location}</td>
                  <td className="border px-4 py-2">{site.program_name}</td>
                  <td className="border px-4 py-2">{site.domain_name}</td>
                  <td className="border px-4 py-2">
                    <StatusBadge status={site.status_client as ClientStatus} />
                  </td>
                  <td className="border px-4 py-2">
                    {site.backend_url?.split("/api")[0] || "-"}
                  </td>
                  <td className="border px-4 py-2">
                    <StatusBadge status={site.status_server} />
                  </td>
                </tr>
              ))}
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
