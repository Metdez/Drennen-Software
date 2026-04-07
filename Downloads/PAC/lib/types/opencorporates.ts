/** A single company result from the OpenCorporates search endpoint. */
export interface OpenCorporatesCompany {
  name: string;
  company_number: string;
  jurisdiction_code: string;
  incorporation_date: string | null;
  dissolution_date: string | null;
  company_type: string | null;
  registry_url: string | null;
  /** Industry codes attached to this company (may be empty). */
  industry_codes: Array<{
    code: string;
    description: string;
    code_scheme_id: string;
  }>;
  registered_address: {
    street_address: string | null;
    locality: string | null;
    region: string | null;
    postal_code: string | null;
    country: string | null;
  } | null;
  current_status: string | null;
}

/** Shape of a single result item within the search response. */
export interface OpenCorporatesSearchResult {
  company: OpenCorporatesCompany;
  score: number;
}

/** Top-level response from GET /companies/search. */
export interface OpenCorporatesSearchResponse {
  api_version: string;
  results: {
    companies: OpenCorporatesSearchResult[];
    total_count: number;
    total_pages: number;
    page: number;
    per_page: number;
  };
}

/** Top-level response from GET /companies/{jurisdiction}/{number}. */
export interface OpenCorporatesDetailResponse {
  api_version: string;
  results: {
    company: OpenCorporatesCompany;
  };
}
