interface Env {
  AUTH_SECRET?: string;
  CRM_ORIGIN?: string;
  DESK_ORIGIN?: string;
  PROPOSAL_ORIGIN?: string;
  PAY_ORIGIN?: string;
  INVOICE_ORIGIN?: string;
  SESSIONS?: KVNamespace;
  CRM?: Fetcher;
  DESK?: Fetcher;
  PROPOSAL?: Fetcher;
  PAY?: Fetcher;
  INVOICE?: Fetcher;
  PUBLIC_TITLE?: string;
}
