import { useEffect } from 'react';

function FlightData() {
  useEffect(() => {
    // Initialize map
    const map = L.map('map').setView([51.505, -0.09], 2);
    
    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  }, []);

  return (
    <div>
      <h2>Flight Data</h2>
      <div id="map" style={{ height: '400px', width: '100%' }}></div>
    </div>
  );
}

export default FlightData;
