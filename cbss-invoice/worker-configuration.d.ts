interface Env {
  AUTH_SECRET?: string;
  WAAVE_API_KEY?: string;
  WAAVE_API_SECRET?: string;
  WAAVE_VENUE_ID?: string;
  WAAVE_API_BASE?: string;
  CRM?: Fetcher;
  INVOICE_STORE?: KVNamespace;
  PUBLIC_TITLE?: string;
}
