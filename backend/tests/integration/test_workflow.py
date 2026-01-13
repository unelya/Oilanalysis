def test_sample_to_analysis_workflow(client):
    sample_payload = {
        "sample_id": "S-100",
        "well_id": "W-10",
        "horizon": "H1",
        "sampling_date": "2024-01-01",
        "status": "new",
        "storage_location": "Shelf A",
        "assigned_to": "Alex",
    }
    res = client.post("/samples", json=sample_payload)
    assert res.status_code == 201
    assert res.json()["sample_id"] == "S-100"

    res = client.patch("/samples/S-100", json={"status": "progress"})
    assert res.status_code == 200
    assert res.json()["status"] == "progress"

    analysis_payload = {"sample_id": "S-100", "analysis_type": "SARA", "assigned_to": ["Dr. Lee"]}
    res = client.post("/planned-analyses", json=analysis_payload)
    assert res.status_code == 201
    analysis = res.json()
    assert analysis["sample_id"] == "S-100"
    assert analysis["analysis_type"] == "SARA"

    res = client.patch(f"/planned-analyses/{analysis['id']}", json={"status": "in_progress"})
    assert res.status_code == 200
    assert res.json()["status"] == "in_progress"
