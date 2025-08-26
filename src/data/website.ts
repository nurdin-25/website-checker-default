export interface WebsiteListInterface {
    server_location: string,
    program_name: string,
    domain_name: string,
    backend_url: string,
}

export interface StatusInterface {
    status_client: boolean,
    status_server: boolean,
}

export type WebsiteListWithStatusInterface = WebsiteListInterface & StatusInterface;

const WebsiteList: Array<WebsiteListInterface> = [
    {
        server_location: "nevacloud-dev",
        program_name: "QC Cabang",
        domain_name: "https://qc-cabang.goldstore.id",
        backend_url: 'https://157.15.124.133:7111/api/v1/system/get',
    },
    {
        server_location: "biznet-2",
        program_name: "QC cabang",
        domain_name: "https://qc-cabang.goldstore.id",
        backend_url: 'https://103.196.146.42:7111/api/v1/system/get',
    },
    {
        server_location: "biznet-1",
        program_name: "kgpst1957.com",
        domain_name: "https://kgpst1957.com",
        backend_url: 'https://103.196.146.28:10002/api/v1/system/get',
    },
    {
        server_location: "biznet-1",
        program_name: "mawarmp.goldstore.id",
        domain_name: "https://mawarmp.goldstore.id",
        backend_url: 'https://103.196.146.28:10003/api/v1/system/get',
    },
    {
        server_location: "biznet-1",
        program_name: "gulabiru.goldstore.id",
        domain_name: "https://gulabiru.goldstore.id",
        backend_url: 'https://103.196.146.28:10004/api/v1/system/get',
    },
    {
        server_location: "biznet-1",
        program_name: "sjg.goldstore.id",
        domain_name: "https://sjg.goldstore.id",
        backend_url: 'https://103.196.146.28:10005/api/v1/system/get',
    }
];

export default WebsiteList;