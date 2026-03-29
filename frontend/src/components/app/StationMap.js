import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../styles/StationMap.css";

const DEFAULT_CENTER = [35.2975, 9.8744];
const DEFAULT_ZOOM = 10;
const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const getStationPoint = (station) => {
  const latitude = Number(station?.latitude);
  const longitude = Number(station?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return [latitude, longitude];
};

const createMarkerIcon = (active) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 3px solid ${active ? "#1d4ed8" : "#166534"};
        background: ${active ? "#2563eb" : "#16a34a"};
        box-shadow: 0 0 0 4px ${active ? "rgba(37,99,235,0.18)" : "rgba(22,163,74,0.16)"};
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

const StationMap = ({ stations, selectedStation, onSelectStation }) => {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  const validStations = useMemo(
    () => (Array.isArray(stations) ? stations.filter((station) => getStationPoint(station)) : []),
    [stations]
  );

  useEffect(() => {
    if (!mapElementRef.current) {
      return undefined;
    }

    if (!mapRef.current) {
      mapRef.current = L.map(mapElementRef.current, {
        zoomControl: true,
      }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

      L.tileLayer(TILE_URL, {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapRef.current);

      L.control.scale({ imperial: false }).addTo(mapRef.current);
    }

    const map = mapRef.current;

    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    validStations.forEach((station) => {
      const point = getStationPoint(station);
      if (!point) {
        return;
      }

      const active = selectedStation?.id === station.id;
      const marker = L.marker(point, {
        icon: createMarkerIcon(active),
      })
        .addTo(map)
        .bindPopup(
          `
            <div class="station-popup">
              <strong>${station.name}</strong><br/>
              <small>${station.address || "Address not available"}</small>
            </div>
          `
        )
        .on("click", () => onSelectStation(station));

      markersRef.current[station.id] = marker;
    });

    if (validStations.length) {
      const bounds = L.latLngBounds(validStations.map((station) => getStationPoint(station)));
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      Object.values(markersRef.current).forEach((marker) => marker.remove());
      markersRef.current = {};
    };
  }, [onSelectStation, selectedStation, validStations]);

  useEffect(() => {
    if (!mapRef.current || !selectedStation) {
      return;
    }

    const point = getStationPoint(selectedStation);
    if (!point) {
      return;
    }

    mapRef.current.flyTo(point, 13, {
      animate: true,
      duration: 0.7,
    });

    const marker = markersRef.current[selectedStation.id];
    if (marker) {
      marker.openPopup();
    }
  }, [selectedStation]);

  useEffect(
    () => () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    },
    []
  );

  return (
    <div className="station-map-container">
      <div className="station-map-header">
        <div>
          <h2 className="station-map-title">Station map</h2>
          <p className="station-map-subtitle">
            Select a station from the list or click a marker to highlight it on the map.
          </p>
        </div>
      </div>

      <div className="station-canvas" ref={mapElementRef} />

      {selectedStation && (
        <div className="location-info">
          <div className="info-item">
            <span className="info-label">Selected station</span>
            <span className="info-value">{selectedStation.name}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Address</span>
            <span className="info-value">{selectedStation.address || "-"}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Available slots</span>
            <span className="info-value">{selectedStation.availableSlots ?? "-"}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Total chargers</span>
            <span className="info-value">{selectedStation.totalSlots ?? selectedStation.capacity ?? "-"}</span>
          </div>
        </div>
      )}

      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-dot selected" />
          <span>Selected station</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot available" />
          <span>Available station</span>
        </div>
      </div>
    </div>
  );
};

export default StationMap;
