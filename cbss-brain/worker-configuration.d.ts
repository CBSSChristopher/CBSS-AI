interface Env {
  AI: {
    run(
      model: string,
      input: Record<string, unknown>,
    ): Promise<unknown>;
  };
  CRM: Fetcher;
  TEAM_PASSWORD: string;
  AUTH_SECRET: string;
  PUBLIC_TITLE: string;
}
