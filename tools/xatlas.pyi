from typing import Any, Optional, Tuple
import numpy as np

class ChartType:
    Invalid: ChartType
    LSCM: ChartType
    Ortho: ChartType
    Piecewise: ChartType
    Planar: ChartType
    name: str
    value: int

class ChartOptions:
    fix_winding: bool
    max_boundary_length: float
    max_chart_area: float
    max_cost: float
    max_iterations: int
    normal_deviation_weight: float
    normal_seam_weight: float
    roundness_weight: float
    straightness_weight: float
    texture_seam_weight: float
    use_input_mesh_uvs: bool
    def __init__(self) -> None: ...

class PackOptions:
    bilinear: bool
    blockAlign: bool
    bruteForce: bool
    create_image: bool
    max_chart_size: int
    padding: int
    resolution: int
    rotate_charts: bool
    rotate_charts_to_axis: bool
    texels_per_unit: float
    def __init__(self) -> None: ...

class Chart:
    atlas_index: int
    faces: Any
    material: Any
    type: ChartType

class Atlas:
    atlas_count: int
    chart_count: int
    chart_image: Any
    height: int
    mesh_count: int
    texels_per_unit: float
    utilization: float
    width: int
    def __init__(self) -> None: ...
    def add_mesh(self, positions: np.ndarray, indices: np.ndarray, normals: Optional[np.ndarray] = ...) -> int: ...
    def generate(self, chart_options: Optional[ChartOptions] = ..., pack_options: Optional[PackOptions] = ...) -> None: ...
    def get_utilization(self, atlas_index: int) -> float: ...
    def __getitem__(self, index: int) -> Tuple[np.ndarray, np.ndarray, np.ndarray]: ...

def export(path: str, positions: np.ndarray, indices: Optional[np.ndarray] = ..., uvs: Optional[np.ndarray] = ..., normals: Optional[np.ndarray] = ...) -> None: ...
def parametrize(positions: np.ndarray, indices: np.ndarray, normals: Optional[np.ndarray] = ..., uvs: Optional[np.ndarray] = ...) -> Tuple[np.ndarray, np.ndarray, np.ndarray]: ...
