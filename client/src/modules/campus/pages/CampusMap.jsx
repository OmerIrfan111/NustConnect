import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import http from '@core/api/http.js';
import { Badge, Card, Chips, EmptyState, ErrorState, PageHeader, SampleDataBanner, SearchBar, Skeleton } from '@core/ui';
import { LOCATION_CATEGORIES } from '../constants.js';
import styles from './Campus.module.css';

const NUST_CENTER = [33.6435, 72.992]; // NUST H-12 (approximate)

export default function CampusMap() {
  const [locations, setLocations] = useState([]);
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [tileFailed, setTileFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await http.get('/campus/locations');
      setLocations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Could not load campus locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filtering happens in the browser, so the list and the map react instantly and work with any amount of seeded data.
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return locations.filter(
      (l) =>
        (category === 'all' || l.category === category) &&
        (!needle || `${l.name} ${l.description || ''} ${l.landmark || ''}`.toLowerCase().includes(needle)),
    );
  }, [locations, category, q]);

  return (
    <section className={styles.page}>
      <PageHeader
        title="Campus Map"
        subtitle="Find gates, departments, food spots and hostels around NUST H-12. No login needed."
      />

      {locations.some((l) => l.isSample) && (
        <SampleDataBanner>Sample data: these are approximate demo points around NUST H-12, not surveyed locations.</SampleDataBanner>
      )}

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <SearchBar value={q} onChange={setQ} onSearch={setQ} allowEmpty placeholder="Search places…" label="Search campus places" />
        </div>
        <Chips items={LOCATION_CATEGORIES} value={category} onChange={setCategory} label="Place category" />
      </div>

      {loading ? (
        <Skeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className={styles.mapLayout}>
          <div className={styles.stack}>
            <p className={styles.meta} aria-live="polite">
              {visible.length} {visible.length === 1 ? 'place' : 'places'}
            </p>
            {visible.length === 0 ? (
              <EmptyState icon={MapPin} title="No places match" description="Try another category or search word." />
            ) : (
              <ul className={styles.placeList} aria-label="Campus places">
                {visible.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      className={`${styles.placeButton} ${selectedId === l.id ? styles.placeActive : ''}`}
                      aria-pressed={selectedId === l.id}
                      onClick={() => setSelectedId(l.id)}
                    >
                      <span className={styles.placeName}>{l.name}</span>
                      <span className={styles.meta}>{l.landmark || l.description}</span>
                      <span>
                        <Badge variant="neutral">{l.category}</Badge>
                      </span>
                    </button>
                    {selectedId === l.id && l.directionsUrl && (
                      <a href={l.directionsUrl} target="_blank" rel="noreferrer" className={styles.backLink}>
                        Get directions ↗
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.stack}>
            {tileFailed && (
              <p role="status" className={styles.notice}>
                The map tiles could not load (you may be offline). The list of places still works.
              </p>
            )}
            <Card padding="sm" aria-label="Map">
              <div className={styles.map}>
                <MapContainer center={NUST_CENTER} zoom={16} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                    eventHandlers={{ tileerror: () => setTileFailed(true), tileload: () => setTileFailed(false) }}
                  />
                  {visible.map((l) => (
                    <CircleMarker
                      key={l.id}
                      center={[l.lat, l.lng]}
                      radius={selectedId === l.id ? 11 : 8}
                      className={selectedId === l.id ? styles.markerActive : styles.marker}
                      eventHandlers={{ click: () => setSelectedId(l.id) }}
                    >
                      <Popup>
                        <strong>{l.name}</strong>
                        <br />
                        {l.description}
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
            </Card>
          </div>
        </div>
      )}
    </section>
  );
}
