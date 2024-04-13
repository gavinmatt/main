import React, { useEffect, useRef, useState } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM'; // Add this import
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { fromLonLat } from 'ol/proj';
import { Icon, Style } from 'ol/style';

function FlightData() {
  const mapElement = useRef();
  const [planeData, setPlaneData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://192.168.68.137:5000/flight_data');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        setPlaneData(data);
      } catch (error) {
        console.error('Error fetching plane data:', error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const map = new Map({
      target: mapElement.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: fromLonLat([-104.79307719504502, 38.941905671619914]),
        zoom: 2,
      }),
    });

    const planeLayer = new VectorLayer({
      source: new VectorSource(),
      style: new Style({
        image: new Icon({
          src: 'plane-icon.png',
          scale: 0.05,
        }),
      }),
    });

    planeData.forEach((plane) => {
      const feature = new Feature({
        geometry: new Point(fromLonLat([plane.longitude, plane.latitude])),
      });
      planeLayer.getSource().addFeature(feature);
    });

    map.addLayer(planeLayer);

    return () => {
      map.setTarget(null);
    };
  }, [planeData]);

  return (
    <div ref={mapElement} style={{ width: '100%', height: '400px' }}>
      {/* Placeholder for OpenLayers map */}
    </div>
  );
}

export default FlightData;
