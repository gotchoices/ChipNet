export interface LinearLink {
    id: string;
    terms: any;
}

export interface LinearSegment {
    nonce: string;
    terms: any;
}

export type LinearRoute = LinearSegment[];