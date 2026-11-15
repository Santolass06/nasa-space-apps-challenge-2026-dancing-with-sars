# Data sources, licenses and citations

Space Apps rules require that **every source used is cited** and that all materials are
free and publicly available or open source. Add a row here **before** using a new dataset.

## Rules (from the official Terms & Conditions)

- Original content must be freely available or [OSI-licensed](https://opensource.org/docs/osd).
  If no license is specified, NASA distributes it under **Apache 2.0**.
- Non-NASA materials must be freely and publicly available, or at minimum OSI-licensed.
- All licenses must be identified in the documentation submitted with the solution, and
  **every resource must be cited**, even when it is open source.
- No export-controlled information (ITAR / EAR).

## NISAR and NASA resources

| Resource | What it gives you | Access | License / citation |
| --- | --- | --- | --- |
| [NASA Earthdata Search](https://search.earthdata.nasa.gov/) | Discovery and download across NASA Earth science data | Free NASA Earthdata login | NASA data: free and open, no restrictions. Cite dataset DOI. |
| [ASF Data Search Vertex](https://vertex.daac.asf.alaska.edu/) | NASA archive of SAR data (NISAR, Sentinel-1, UAVSAR…) | Free Earthdata login | NASA data, open. Acknowledge ASF DAAC. |
| [NISAR Data User Guide](https://asf.alaska.edu/how-to/data-recipes/nisar-data-user-guide/) | How to find, access and process NISAR products | Public web | Documentation — cite ASF. |
| [Intro to Remote Sensing](https://www.earthdata.nasa.gov/learn/backgrounders/remote-sensing) | Background concepts | Public web | Cite NASA Earthdata. |
| [Intro to SAR](https://www.earthdata.nasa.gov/learn/backgrounders/what-is-sar) | SAR fundamentals: frequency, polarization, scattering | Public web | Cite NASA Earthdata. |
| [NASA ARSET](https://appliedsciences.nasa.gov/join-mission/training) | Trainings on SAR, disasters, agriculture, water | Free registration | Cite NASA ARSET. |
| [NISAR StoryMaps](https://nisar.jpl.nasa.gov/) | Storytelling examples: floods, wildfires, subsidence, oil slicks, glaciers | Public web | Cite NASA/JPL. |
| [NISAR Applications White Papers](https://nisar.jpl.nasa.gov/applications/) | Two-page application overviews | Public web | Cite NASA/JPL. |
| [UAVSAR Postcards](https://uavsar.jpl.nasa.gov/science/dataproducts.html) | False-colour airborne SAR examples | Public web | Cite NASA/JPL. |

**Suggested NISAR acknowledgement** (confirm the current wording in the NISAR Data User
Guide before submitting):

> NISAR data courtesy of NASA/JPL-Caltech and ISRO, accessed through the Alaska Satellite
> Facility DAAC and NASA Earthdata.

## Space Agency Partner resources

| Resource | What it gives you | Access / license |
| --- | --- | --- |
| [CSA RADARSAT Constellation Mission](https://www.asc-csa.gc.ca/eng/satellites/radarsat/) | C-band SAR trio: maritime, disasters, ecosystems | See CSA data policy; cite CSA. |
| [SAR Python tutorial (CSA)](https://www.asc-csa.gc.ca/eng/satellites/radarsat/tutorial.asp) | Practical SAR processing with Python/QGIS | Educational material; cite CSA. |
| [RADARSAT-1 archive](https://www.asc-csa.gc.ca/eng/satellites/radarsat1/) | Historical C-band SAR | Released under an open license; cite CSA. |
| [CONAE SAOCOM catalogue](https://saocom.conae.gov.ar/) | L-band SAR from SAOCOM | Registration required; cite CONAE and follow their data policy. |

## Datasets actually used by this project

Keep this table in sync with `NOTICE`, `docs/PRODUCTS.md` and the Space Apps submission form.
Rows marked *verify* have a licence or attribution text still to confirm.

| Dataset / product | Dates | Area | Source | License | Citation |
| --- | --- | --- | --- | --- | --- |
| NISAR L2 GUNW (coherence) | 2026-06-17 → 2026-07-23 | Vouzela / Caramulo | [ASF Vertex](https://vertex.daac.asf.alaska.edu/) | NASA open | NASA/JPL-Caltech and ISRO, via ASF DAAC. Product names in `PRODUCTS.md` |
| NISAR L2 GCOV (HH, HV backscatter) | 2026-06 → 2026-10 | Vouzela / Caramulo | [ASF Vertex](https://vertex.daac.asf.alaska.edu/) | NASA open | NASA/JPL-Caltech and ISRO, via ASF DAAC |
| Sentinel-2 L2A (true colour context) | 2026-06 / 2026-07 | Vouzela / Caramulo | [Earth Search](https://earth-search.aws.element84.com/) (Element 84) | Copernicus free and open (*verify* wording) | Contains modified Copernicus Sentinel data 2026 |
| Official burned-area perimeter (Tourelhe wildfire) | 2026-07 | Vouzela / Caramulo | [ICNF cartography ZIP](https://www.icnf.pt/api/file/doc/7205ba3d11e327a9). Original format: Shapefile (EPSG:3763), converted to WGS84 GeoJSON. | *verify* — dataset-specific reuse terms have not been confirmed. | Instituto da Conservação da Natureza e das Florestas, I.P. (ICNF), [post-fire emergency stabilisation report REE_2026_004](https://www.icnf.pt/api/file/doc/d305b338642255f3), p. 6. |
| Basemap | n/a | Portugal | OpenFreeMap / OpenStreetMap (*verify* in F0) | ODbL (*verify*) | © OpenStreetMap contributors |
| Village coordinates for Matadegas and Mançores (`places.geojson`) | n/a | Tondela | OpenStreetMap hamlet nodes [5347012983](https://www.openstreetmap.org/node/5347012983) and [4187904717](https://www.openstreetmap.org/node/4187904717); the spellings agree with the INE census locality names (Nominatim lists both) | ODbL | © OpenStreetMap contributors. Replaces the postcode-centroid points used before, which put Mançores about 5 km from the village |
| Fire facts (start, end, hectares, evacuations) | 2026-07 | Vouzela / Caramulo | News and ICNF, listed in the "Fontes" section of [`DOSSIER.md`](DOSSIER.md) | Cited, not redistributed | Lusa, Agroportal, Sábado, ICNF |

## Reproducibility

- Record the product identifiers (granule names) in [`PRODUCTS.md`](PRODUCTS.md), not the data itself.
- Downloads go to `data/raw/` and are git-ignored.
- If a processing step depends on a specific product version, pin it in the manifest.
