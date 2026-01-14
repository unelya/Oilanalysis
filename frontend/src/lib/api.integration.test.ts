import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPlannedAnalysis, createSample, fetchSamples, mapApiAnalysis, updateSampleStatus } from "./api";

describe("api integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a sample and maps response", async () => {
    const mockResponse = {
      sample_id: "S-200",
      well_id: "W-1",
      horizon: "H1",
      sampling_date: "2024-02-02",
      status: "new",
      storage_location: "Fridge 1 · Bin 1 · Place 1",
      assigned_to: "Alex",
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => mockResponse,
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createSample({
      sampleId: "S-200",
      wellId: "W-1",
      horizon: "H1",
      samplingDate: "2024-02-02",
      storageLocation: "Fridge 1 · Bin 1 · Place 1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/samples",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.sampleId).toBe("S-200");
    expect(result.statusLabel).toBe("Planned");
  });

  it("updates sample status", async () => {
    const mockResponse = {
      sample_id: "S-201",
      well_id: "W-2",
      horizon: "H2",
      sampling_date: "2024-02-03",
      status: "progress",
      storage_location: "Fridge 2 · Bin 2 · Place 2",
      assigned_to: null,
    };
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => mockResponse,
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await updateSampleStatus("S-201", "progress");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/samples/S-201",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(result.status).toBe("progress");
    expect(result.statusLabel).toBe("Awaiting arrival");
  });

  it("maps planned analyses correctly", async () => {
    const apiPayload = { id: 3, sample_id: "S-300", analysis_type: "SARA", status: "planned", assigned_to: ["Alex"] };
    const mapped = mapApiAnalysis(apiPayload);
    expect(mapped.sampleId).toBe("S-300");
    expect(mapped.analysisType).toBe("SARA");
    expect(mapped.assignedTo).toEqual(["Alex"]);
  });

  it("fetches samples list", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [
        {
          sample_id: "S-210",
          well_id: "W-3",
          horizon: "H3",
          sampling_date: "2024-02-04",
          status: "new",
          storage_location: "Shelf A",
          assigned_to: "Sam",
        },
      ],
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchSamples();
    expect(result).toHaveLength(1);
    expect(result[0].sampleId).toBe("S-210");
  });

  it("creates a planned analysis", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: 7,
        sample_id: "S-400",
        analysis_type: "IR",
        status: "planned",
        assigned_to: ["Dana"],
      }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const result = await createPlannedAnalysis({ sampleId: "S-400", analysisType: "IR", assignedTo: "Dana" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/planned-analyses",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.sample_id).toBe("S-400");
  });
});
