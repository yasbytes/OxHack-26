import { Link } from 'react-router-dom'
import { MOODS } from '../pet.ts'
import { SHOP_ITEMS } from '../shopStore.ts'
import { BASE_MAX_COINS_PER_DAY, BASE_MONTH_BONUS, START_COINS } from '../coins.ts'
import { useLimits } from '../profileStore.ts'

// How each mood is reached, in words, from the same thresholds the cat uses
function moodRange(index: number) {
  const percent = (fraction: number) => `${Math.round(fraction * 100)}%`
  const mood = MOODS[index]
  if (index === 0) return `under ${percent(mood.max)} of your monthly limit`
  const from = percent(MOODS[index - 1].max)
  return mood.max === Infinity ? `over ${from}` : `${from} to ${percent(mood.max)}`
}

// How the app works, in plain words, for anyone new to it
function InfoPage() {
  const { monthlyLimitKg, weeklyBudgetKg } = useLimits()

  return (
    <main className="main">
      <header className="header">
        <h1 className="header__greeting">How it works</h1>
      </header>

      <section className="card info__card info__intro">
        <p className="info__lead">
          Future Earth helps you see the carbon (CO₂e) your everyday life creates and bring it
          down, with a cat who's counting on you.
        </p>
        <ol className="info__steps">
          <li>
            <strong>Set your limit.</strong> In <Link to="/dashboard/profile">Profile</Link>, choose a
            monthly carbon limit. Yours is {monthlyLimitKg} kg a month, about {weeklyBudgetKg} kg a week.
          </li>
          <li>
            <strong>Log your day.</strong> On <Link to="/dashboard">Home</Link>, add your journeys,
            energy bills and meals. We work out the carbon for you.
          </li>
          <li>
            <strong>Look after your cat.</strong> Stay under your limit to keep it happy and earn
            coins to spend on treats.
          </li>
        </ol>
      </section>

      <div className="info__grid">
        <section className="card info__card">
          <h2 className="card__title">Logging</h2>
          <ul className="info__list">
            <li>
              <strong>Travel:</strong> pick how you went, then type where from and where to. We find
              the distance, or you can type it in.
            </li>
            <li>
              <strong>Home energy:</strong> enter what you paid on a bill, or estimate your use.
            </li>
            <li>
              <strong>Food:</strong> choose what your meal mostly was. Meat, especially beef and lamb,
              counts the most.
            </li>
          </ul>
          <p className="info__note">Everything you log is kept in History, where you can delete mistakes.</p>
        </section>

        <section className="card info__card">
          <h2 className="card__title">Your cat</h2>
          <p className="info__text">
            Its mood follows this month's footprint against your monthly limit, the same as the
            bar on Home, and it starts afresh each month. Click it to hear what it thinks. It also speaks up whenever you log
            something.
          </p>
          <ul className="info__moods">
            {MOODS.map((mood, i) => (
              <li key={mood.id} className="info__mood">
                <img src={mood.image} alt="" className="info__mood-img" />
                <span>
                  <strong>{mood.label}</strong>
                  <span className="info__mood-range">{moodRange(i)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card info__card">
          <h2 className="card__title">Coins and the shop</h2>
          <ul className="info__list">
            <li>You start with {START_COINS} coins.</li>
            <li>
              Each finished day you log and stay under budget earns up to {BASE_MAX_COINS_PER_DAY}{' '}
              coins. The more you save, the more you get.
            </li>
            <li>
              A whole month under your limit, logged on most days, adds a {BASE_MONTH_BONUS}-coin
              bonus.
            </li>
            <li>Setting a stricter limit multiplies everything you earn.</li>
          </ul>
          <p className="info__text">
            Spend coins in the <Link to="/dashboard/shop">Shop</Link>, then feed your cat from its
            card on Home. Food lifts its mood one level, and brings a collapsed cat back to Okay.
          </p>
          <ul className="info__list">
            {SHOP_ITEMS.map((item) => (
              <li key={item.id}>
                <strong>{item.name}:</strong> {item.price} coins, a happier cat for {item.boostHours} hours
              </li>
            ))}
          </ul>
        </section>

        <section className="card info__card">
          <h2 className="card__title">Friends</h2>
          <p className="info__text">
            Add friends by their username or email on the <Link to="/dashboard/friends">Friends</Link>{' '}
            page. Once they accept, you'll see each other on a weekly leaderboard.
          </p>
          <p className="info__text">
            Everyone is ranked against their own budget, so it's fair even if your limits differ.
            Friends only see your totals, never what you logged.
          </p>
        </section>

        <section className="card info__card">
          <h2 className="card__title">Insights and History</h2>
          <ul className="info__list">
            <li>
              <strong><Link to="/dashboard/insights">Insights</Link></strong> shows your week, your year
              so far, where you're heading by December, and where most of your carbon comes from.
            </li>
            <li>
              <strong><Link to="/dashboard/history">History</Link></strong> lists every entry by day.
              Filter it by travel, energy or food.
            </li>
          </ul>
        </section>

        <section className="card info__card">
          <h2 className="card__title">Ask Gemini</h2>
          <p className="info__text">
            On Home, ask about a journey, like "Oxford to London by train?", to compare the carbon of
            each way to get there. You can also ask any question about cutting your footprint.
          </p>
          <p className="info__note">All numbers are estimates based on typical UK figures.</p>
        </section>
      </div>
    </main>
  )
}

export default InfoPage
