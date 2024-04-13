import { useEffect } from 'react';
import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import OSM from 'ol/source/OSM';

function FlightData() {
  useEffect(() => {
    // Initialize map
    const map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
      ],
      view: new View({
        center: [38.894021227029974, -104.7945291896578],
        zoom: 2,
      }),
    });
  }, []);

  return (
    <div>
      <h2>Flight Data</h2>
      <div id="map" style={{ height: '400px', width: '100%' }}></div>
    </div>
  );
}

export default FlightData;
