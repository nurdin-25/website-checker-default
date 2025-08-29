export interface WebsiteListInterface {
    server_location: string,
    program_name: string,
    domain_name: string,
    backend_url: string,
    port: string,
}

export interface StatusInterface {
    status_client: boolean,
    status_server: boolean,
}

export type WebsiteListWithStatusInterface = WebsiteListInterface & StatusInterface;