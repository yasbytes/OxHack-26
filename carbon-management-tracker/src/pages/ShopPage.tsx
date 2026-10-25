import { buyItem, feedItem, SHOP_ITEMS, useFed, useShop } from '../shopStore.ts'
import {
  BASE_MAX_COINS_PER_DAY,
  BASE_MONTH_BONUS,
  dailyBudgetKg,
  rewardMultiplier,
} from '../coins.ts'
import { useProfile } from '../profileStore.ts'

function ShopPage() {
  const { coins, owned } = useShop()
  const { fed, hoursLeft } = useFed()
  const { petName, monthlyLimitKg } = useProfile()
  const budget = Math.round(dailyBudgetKg(monthlyLimitKg))
  const multiplier = rewardMultiplier(monthlyLimitKg)

  return (
    <main className="main">
      <header className="header">
        <h1 className="header__greeting">Shop</h1>
        <span className="shop__balance" aria-label={`${coins} coins`}>
          <span className="pet__coin shop__coin" aria-hidden="true" />
          {coins}
        </span>
      </header>

      <section className="card shop__card">
        <h2 className="card__title">Treat your cat</h2>
        <p className="chart-card__sub">
          Each day you log and stay under {budget} kg earns up to {Math.round(BASE_MAX_COINS_PER_DAY * multiplier)}{' '}
          coins, the more you save the more you get. A month under your limit, logged on most days,
          adds a {Math.round(BASE_MONTH_BONUS * multiplier)}-coin bonus. Coins for a day arrive the next morning.
          {fed && ` ${petName || 'Your cat'} is well fed for ${hoursLeft} more ${hoursLeft === 1 ? 'hour' : 'hours'}.`}
        </p>

        <ul className="shop__list">
          {SHOP_ITEMS.map((item) => {
            const short = item.price - coins
            return (
              <li key={item.id} className="shop__item">
                <img src={item.image} alt="" className="shop__img" />
                <div className="shop__info">
                  <h3 className="shop__name">{item.name}</h3>
                  <p className="shop__desc">{item.description}</p>
                  <span className="shop__price">
                    <span className="pet__coin" aria-hidden="true" />
                    {item.price} coins
                  </span>
                </div>
                <div className="shop__actions">
                  <button
                    type="button"
                    className="calculate shop__buy"
                    disabled={short > 0}
                    onClick={() => buyItem(item)}
                  >
                    {short > 0 ? `need ${short} more` : 'buy'}
                  </button>
                  <button
                    type="button"
                    className="profile__button"
                    disabled={owned[item.id] < 1}
                    onClick={() => feedItem(item, petName)}
                  >
                    Feed ({owned[item.id]} owned)
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </main>
  )
}

export default ShopPage
