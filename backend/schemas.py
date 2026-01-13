from pydantic import BaseModel, Field


class Sample(BaseModel):
    sample_id: str = Field(min_length=2, max_length=64)
    well_id: str = Field(min_length=1, max_length=32)
    horizon: str = Field(min_length=1, max_length=32)
    sampling_date: str = Field(min_length=4, max_length=32)
    status: str = "new"
    storage_location: str | None = Field(default=None, max_length=128)


class PlannedAnalysisCreate(BaseModel):
    sample_id: str = Field(min_length=2, max_length=64)
    analysis_type: str = Field(min_length=2, max_length=64)
    assigned_to: list[str] | str | None = Field(default=None)


class PlannedAnalysisUpdate(BaseModel):
    status: str | None = Field(default=None, pattern="^(planned|in_progress|review|completed|failed)$")
    assigned_to: list[str] | str | None = Field(default=None)


class PlannedAnalysisOut(BaseModel):
    id: int
    sample_id: str
    analysis_type: str
    status: str
    assigned_to: list[str] | None = None


class FilterMethodsUpdate(BaseModel):
    methods: list[str] = []


class FilterMethodsOut(BaseModel):
    methods: list[str] = []


class ActionBatchCreate(BaseModel):
    title: str = Field(min_length=2, max_length=128)
    date: str = Field(min_length=4, max_length=32)
    status: str = Field(default="new", pattern="^(new|review|done)$")


class ActionBatchOut(BaseModel):
    id: int
    title: str
    date: str
    status: str


class ConflictCreate(BaseModel):
    old_payload: str = Field(min_length=1)
    new_payload: str = Field(min_length=1)
    status: str = Field(default="open", pattern="^(open|resolved)$")


class ConflictUpdate(BaseModel):
    status: str | None = Field(default=None, pattern="^(open|resolved)$")
    resolution_note: str | None = Field(default=None, max_length=256)


class ConflictOut(BaseModel):
    id: int
    old_payload: str
    new_payload: str
    status: str
    resolution_note: str | None = None


class UserOut(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    roles: list[str]


class UserUpdate(BaseModel):
    role: str | None = Field(default=None, pattern="^(warehouse_worker|lab_operator|action_supervision|admin)$")
    roles: list[str] | None = None
