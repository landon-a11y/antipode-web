import { useState, useRef, useEffect } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

function App() {
  const [city, setCity] = useState('');
  const [info, setInfo] = useState(null);
  const [beam, setBeam] = useState([]); 
  const [markers, setMarkers] = useState([]); 
  const globeEl = useRef();

  // 1. SAFE TRANSPARENCY FIX
  // Instead of using the helper function that was crashing, we find the globe manually.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (globeEl.current) {
        // Access the raw 3D scene
        const scene = globeEl.current.scene();
        
        // Search through the 3D objects to find the Earth sphere
        scene.traverse((obj) => {
          if (obj.isMesh) {
            // Turn it into glass
            obj.material.transparent = true;
            obj.material.opacity = 0.5; // 50% see-through
          }
        });
      }
    }, 1000); // Wait 1 second for the globe to be built
    return () => clearTimeout(timer);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${city}`)
      .then(response => response.json())
      .then(data => {
        if (data.length > 0) {
          const result = data[0];
          const startLat = parseFloat(result.lat);
          const startLng = parseFloat(result.lon);

          // Calculate Antipode
          const endLat = startLat * -1;
          let endLng = startLng + 180;
          if (endLng > 180) endLng = endLng - 360;

          // 2. REVERSE GEOCODING (Find name of place on other side)
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${endLat}&lon=${endLng}&zoom=10`)
            .then(res => res.json())
            .then(geoData => {
              const antipodeName = geoData.display_name || "Ocean / Unknown Area";

              setInfo({ start: result.display_name, end: antipodeName });

              // 3. SET MARKERS
              setMarkers([
                { lat: startLat, lng: startLng, size: 0.5, color: '#ff0055', name: "Start" },
                { lat: endLat, lng: endLng, size: 0.5, color: '#00ffff', name: "Antipode" }
              ]);

              // 4. CREATE THE BEAM
              setBeam([{
                startLat: startLat,
                startLng: startLng,
                endLat: endLat,
                endLng: endLng
              }]);

              // 5. MOVE CAMERA
              globeEl.current.pointOfView({ lat: 0, lng: startLng - 90, altitude: 2.5 }, 2000);
            });

        } else {
          alert("City not found!");
        }
      })
      .catch(err => console.error("API Error:", err));
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      
      {/* UI OVERLAY */}
      <div style={{
        position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 10, textAlign: 'center', fontFamily: 'Arial, sans-serif', width: '80%', pointerEvents: 'none'
      }}>
        <h1 style={{ color: 'white', textShadow: '0 0 20px cyan', margin: '0 0 10px 0', letterSpacing: '2px' }}>
          GLOBE ANTIPODE
        </h1>
        <div style={{ pointerEvents: 'auto', display: 'inline-block' }}>
            <form onSubmit={handleSearch}>
            <input 
                type="text" 
                placeholder="Enter city (e.g. Paris)..." 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                style={{ 
                    padding: '12px 25px', borderRadius: '30px', width: '300px', fontSize: '16px',
                    background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid white',
                    backdropFilter: 'blur(5px)'
                }}
            />
            </form>
        </div>

        {info && (
          <div style={{
            marginTop: '20px', backgroundColor: 'rgba(0, 0, 0, 0.6)', padding: '20px',
            borderRadius: '15px', color: 'white', border: '1px solid rgba(0,255,255,0.3)',
            backdropFilter: 'blur(10px)', pointerEvents: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div style={{ maxWidth: '40%' }}>
                    <div style={{fontSize: '0.8rem', color: '#ff0055'}}>LOCATION</div>
                    <div>{info.start.split(',')[0]}</div>
                </div>
                <div style={{fontSize: '2rem'}}>⇌</div>
                <div style={{ maxWidth: '40%' }}>
                    <div style={{fontSize: '0.8rem', color: '#00ffff'}}>ANTIPODE</div>
                    <div>{info.end.split(',')[0]}</div>
                </div>
            </div>
            <div style={{fontSize: '0.8rem', marginTop: '10px', opacity: 0.7}}>
                {info.end}
            </div>
          </div>
        )}
      </div>

      {/* THE GLOBE */}
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        
        pointsData={markers}
        pointAltitude={0.02}
        pointColor="color"
        pointRadius={0.5}
        pointPulseBtn={true}

        // BEAM LOGIC
        customLayerData={beam}
        customThreeObject={(d) => {
            if (!globeEl.current) return null;

            const startPos = globeEl.current.getCoords(d.startLat, d.startLng, 0);
            const endPos = globeEl.current.getCoords(d.endLat, d.endLng, 0);

            if (!startPos || !endPos) return null;

            const path = new THREE.LineCurve3(
                new THREE.Vector3(startPos.x, startPos.y, startPos.z), 
                new THREE.Vector3(endPos.x, endPos.y, endPos.z)
            );

            const geometry = new THREE.TubeGeometry(path, 1, 0.3, 8, false);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 });
            return new THREE.Mesh(geometry, material);
        }}
        customThreeObjectUpdate={(obj) => {
            // No animation needed for now
        }}
      />
    </div>
  );
}

export default App;