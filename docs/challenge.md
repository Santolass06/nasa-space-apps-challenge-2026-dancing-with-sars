# Challenge: Dancing with the SARs

> Offline snapshot of the official 2026 challenge statement, kept in the repository so
> the team can work without the website. Source:
> <https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/>
> (last published 2026-11-13). Rewards and rules may be updated by NASA — always check
> the live page before submitting.

**Event:** 2026 NASA Space Apps Challenge · **Difficulty:** Advanced / Intermediate ·
**Subject:** Earth Science

## Summary

Earth's surface is an endless dance of natural processes and human activities, but these
changes are often difficult to visualize, understand and communicate. From wetland loss to
forest wildfires, earthquakes, farming activities, glacier movement and more, Earth is in a
constant waltz of surface changes.

> Build an interactive application that uses radar remote sensing data from the **NASA-ISRO
> Synthetic Aperture Radar (NISAR)** mission to track and visualize one or more types of
> surface change at locations around the world.

## Background

- Remote sensing gives a bird's-eye view of Earth; passive instruments use reflected sunlight,
  while **radar** is *active*: it emits its own microwave energy and records the backscatter.
- SAR "synthesizes" a long antenna from a sequence of acquisitions, giving high spatial
  resolution. It works day and night and through clouds, which matters for disasters
  (oil spills, wildfires, hurricanes).
- Radar is sensitive to two things: **roughness** and the **dielectric constant**. Water has a
  high dielectric constant, so SAR highlights water bodies, flood inundation and soil moisture.
- SAR can measure fine surface movement at the centimetre scale (earthquakes, subsidence).

## Objectives

1. Pick an interesting study area — hometown, tropical wetland, ice sheet, wildfire scar,
   flooded neighbourhood, volcano…
2. Download freely available NISAR data (see [data-sources.md](data-sources.md)); add optical
   or GIS layers for context.
3. Present findings in an interactive digital medium: change-detection maps, time-series
   animations, dashboards, story maps.
4. Hypothesize the physical drivers behind what you see (or don't see), which polarizations
   highlight the change, and what future NISAR applications are possible.

Desired outcome: an **open-source, user-friendly** solution that translates complex radar
observations into actionable insights for scientists, resource managers, educators,
decision-makers and the public.

## Potential considerations (optional)

- Compare different polarizations and/or frequencies, and multiple dates.
- Show how human drivers (agriculture, industry) affect natural resources.
- Focus on compelling storytelling through data visualisation.
- Add personal context if the study area is familiar.
- Make the summary interactive (image sliders, web maps).

## Official resources

Full annotated list with licenses and citations: [data-sources.md](data-sources.md).

- [NASA Earthdata Search](https://search.earthdata.nasa.gov/)
- [ASF Data Search Vertex](https://vertex.daac.asf.alaska.edu/)
- [NISAR Data User Guide](https://asf.alaska.edu/how-to/data-recipes/nisar-data-user-guide/)
- [Intro to Remote Sensing](https://www.earthdata.nasa.gov/learn/backgrounders/remote-sensing)
- [Intro to SAR](https://www.earthdata.nasa.gov/learn/backgrounders/what-is-sar)
- [NASA ARSET trainings](https://appliedsciences.nasa.gov/join-mission/training)
- [NISAR StoryMaps](https://nisar.jpl.nasa.gov/)
- [NISAR Applications White Papers](https://nisar.jpl.nasa.gov/applications/)
- [UAVSAR Postcards](https://uavsar.jpl.nasa.gov/science/dataproducts.html)

## Space Agency Partner resources

- **CSA (Canada):** RADARSAT Constellation Mission data, a SAR Python tutorial, RADARSAT-1 archive.
- **CONAE (Argentina):** SAOCOM catalogue and registration.

Exact links and access notes are in [data-sources.md](data-sources.md).
