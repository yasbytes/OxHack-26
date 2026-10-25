import cloud1 from '../assets/icons/cloud-1.svg'
import cloud2 from '../assets/icons/cloud-2.svg'
import cloud4 from '../assets/icons/cloud-4.svg'
import { CONDITION_LABELS, useWeather } from '../weather.ts'

function WeatherBadge() {
  const weather = useWeather()

  if (!weather) {
    return (
      <div className="weather" aria-label="Loading the weather">
        <span className="weather__temp weather__temp--loading">--°C</span>
      </div>
    )
  }

  const { temperature, condition, isDay, place } = weather
  const label = `${temperature} degrees, ${CONDITION_LABELS[condition]}${place ? ` in ${place}` : ''}`
  const showSky = condition === 'clear' || condition === 'partly'
  const showClouds = condition !== 'clear'

  return (
    <div className="weather" role="img" aria-label={label} title={label}>
      <div className={`weather__cloud weather__cloud--${condition}`} aria-hidden="true">
        {showSky && <span className={isDay ? 'weather__sun' : 'weather__moon'} />}
        {showClouds && (
          <div className="weather__cloud-inner">
            <img src={cloud1} alt="" style={{ left: 0, top: 26 }} />
            <img src={cloud4} alt="" style={{ left: 32, top: 26 }} />
            <img src={cloud2} alt="" style={{ left: 23, top: 0 }} />
            <img src={cloud1} alt="" style={{ left: 45, top: 24 }} />
          </div>
        )}
        {(condition === 'rain' || condition === 'snow' || condition === 'storm') && (
          <span className={`weather__fall weather__fall--${condition === 'snow' ? 'snow' : 'rain'}`}>
            <span />
            <span />
            <span />
          </span>
        )}
        {condition === 'storm' && <span className="weather__bolt" />}
      </div>
      <span className="weather__temp">{temperature}°C</span>
    </div>
  )
}

export default WeatherBadge
