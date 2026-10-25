import { loadPetName } from '../pet.ts'
import { buyItem, feedItem, LOG_REWARD, SHOP_ITEMS, useFed, useShop } from '../shopStore.ts'

function ShopPage() {
  const { coins, owned } = useShop()
  const { fed, hoursLeft } = useFed()
  const petName = loadPetName()

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
          Earn {LOG_REWARD} coins for every activity you log. Food cheers your cat up by one mood
          for a while.
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
