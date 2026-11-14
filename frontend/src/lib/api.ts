/** Base URL of the API, configurable at build time with VITE_API_URL. */
export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface StudyArea {
  id: string;
  name: string;
  description: string;
  bbox: [number, number, number, number];
  highlight: string;
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${path}`);
  }
  return (await response.json()) as T;
}

export const getHealth = () => request<HealthResponse>("/api/health");

export const getStudyAreas = () => request<StudyArea[]>("/api/study-areas");
