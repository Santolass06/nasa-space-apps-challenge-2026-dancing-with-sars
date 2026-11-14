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

Keep this table in sync with `NOTICE` and the Space Apps submission form.

| Dataset / product | Dates | Area | Source URL | License | Citation |
| --- | --- | --- | --- | --- | --- |
| _e.g. NISAR GCOV_ | _2026-…_ | _…_ | _…_ | NASA open | _…_ |

## Reproducibility

- Record the product identifiers (e.g. granule names) in `data/README.md` or a manifest,
  not the data itself.
- Downloads go to `data/raw/` and are git-ignored.
- If a processing step depends on a specific product version, pin it in the manifest.
