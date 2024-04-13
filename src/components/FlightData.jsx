import { useState, useEffect } from 'react';

function FlightData() {
  const [flights, setFlights] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://192.168.68.137:5000/flight_data');
        if (!response.ok) {
          throw new Error('Failed to fetch flight data');
        }
        const data = await response.json();
        setFlights(data);
        setIsLoading(false);
      } catch (error) {
        setError(error.message);
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Flight Data</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div>
          <div id="map" style={{ height: '400px', width: '100%' }}></div>
          <ul>
            {flights.map(flight => (
              <li key={flight.id}>
                {flight.callsign} - {flight.destination}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default FlightData;
