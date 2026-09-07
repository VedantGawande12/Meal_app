import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

function App() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [user, setUser] = useState(null)
  const [recipes, setRecipes] = useState([])
  const [recipeQuery, setRecipeQuery] = useState('')
  const [diet, setDiet] = useState('')
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [recipeError, setRecipeError] = useState('')
  const [selectedRecipe, setSelectedRecipe] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  const loadRecipes = async (query = recipeQuery, selectedDiet = diet) => {
    setRecipeLoading(true)
    setRecipeError('')
    const params = new URLSearchParams({ query, diet: selectedDiet, number: '12' })

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/recipes/search?${params}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Recipes could not be loaded.')
      setRecipes(payload.results || [])
    } catch (error) {
      setRecipeError(error.message)
    } finally {
      setRecipeLoading(false)
    }
  }

  const openRecipe = async (recipeId) => {
    setDetailLoading(true)
    setDetailError('')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/recipes/${recipeId}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Recipe details could not be loaded.')
      setSelectedRecipe(payload)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setDetailError(error.message)
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    )
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) loadRecipes()
  }, [user])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const result = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

      if (result.error) {
        const isRateLimited = result.error.status === 429
          || result.error.code === 'over_email_send_rate_limit'
          || result.error.message.toLowerCase().includes('rate limit')
          || result.error.message.toLowerCase().includes('limit exceeded')

        setMessage(isRateLimited
          ? 'Supabase has temporarily limited confirmation emails. Wait a while before trying again, or configure custom SMTP in your Supabase project.'
          : result.error.message)
      } else if (mode === 'signup' && !result.data.session) {
        setMessage('Check your inbox to confirm your email, then come back to log in.')
      } else {
        setMessage('Welcome back. Your account is ready.')
      }
    } catch (error) {
      setMessage(error.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setMessage('')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setMessage('You have been signed out.')
  }

  if (user) {
    return (
      <main className="dashboard-shell">
        <header className="dashboard-header">
          <div className="brand-lockup"><div className="brand-mark">M</div><span>mise</span></div>
          <div className="account-area"><span>{user.email}</span><button type="button" className="secondary-button" onClick={handleSignOut}>Sign out</button></div>
        </header>
        <section className="dashboard-content">
          {selectedRecipe ? (
            <section className="recipe-detail">
              <button type="button" className="back-button" onClick={() => setSelectedRecipe(null)}>&#8592; Back to recipes</button>
              {detailError && <div className="recipe-feedback"><p>{detailError}</p><button type="button" className="text-button" onClick={() => openRecipe(selectedRecipe.id)}>Try again</button></div>}
              <div className="recipe-detail-hero">
                <img src={selectedRecipe.image} alt="" />
                <div className="recipe-detail-heading">
                  <p className="eyebrow">{selectedRecipe.dishTypes?.[0] || 'Recipe'}</p>
                  <h1>{selectedRecipe.title}</h1>
                  <p className="recipe-summary" dangerouslySetInnerHTML={{ __html: selectedRecipe.summary || 'A recipe worth making.' }} />
                  <div className="recipe-stats"><span>{selectedRecipe.readyInMinutes || '-'} min</span><span>{selectedRecipe.servings || '-'} servings</span>{selectedRecipe.vegetarian && <span>Vegetarian</span>}</div>
                </div>
              </div>
              <div className="recipe-detail-body">
                <div className="ingredients-column"><p className="eyebrow">Gather your ingredients</p><h2>What you need</h2><ul>{(selectedRecipe.extendedIngredients || []).map((ingredient) => <li key={ingredient.id || ingredient.original}>{ingredient.original}</li>)}</ul></div>
                <div className="instructions-column"><p className="eyebrow">Take it step by step</p><h2>How to make it</h2>{selectedRecipe.analyzedInstructions?.[0]?.steps?.length ? <ol>{selectedRecipe.analyzedInstructions[0].steps.map((step) => <li key={step.number}><span>{step.number}</span><p>{step.step}</p></li>)}</ol> : <p className="no-instructions">Instructions are not available for this recipe yet.</p>}</div>
              </div>
            </section>
          ) : (
            <>
          <div className="dashboard-heading">
            <div><p className="eyebrow">Your personal table</p><h1>What are we<br /><em>cooking today?</em></h1></div>
            <p className="dashboard-copy">A little inspiration from Spoonacular, ready whenever you are.</p>
          </div>
          <form className="recipe-search" onSubmit={(event) => { event.preventDefault(); loadRecipes() }}>
            <input aria-label="Search recipes" value={recipeQuery} onChange={(event) => setRecipeQuery(event.target.value)} placeholder="Search by ingredient or dish..." />
            <select aria-label="Filter by diet" value={diet} onChange={(event) => { setDiet(event.target.value); loadRecipes(recipeQuery, event.target.value) }}>
              <option value="">All diets</option><option value="vegetarian">Vegetarian</option><option value="vegan">Vegan</option><option value="gluten free">Gluten free</option><option value="ketogenic">Keto</option>
            </select>
            <button type="submit" className="submit-button" disabled={recipeLoading}>{recipeLoading ? 'Searching...' : 'Find recipes'} <span aria-hidden="true">&#8594;</span></button>
          </form>
          {recipeError && <div className="recipe-feedback"><p>{recipeError}</p><button type="button" className="text-button" onClick={() => loadRecipes()}>Try again</button></div>}
          {!recipeLoading && !recipeError && recipes.length === 0 && <div className="empty-state"><p className="eyebrow">Nothing on the table yet</p><h2>Search for a dish<br />to get started.</h2></div>}
          <div className="recipe-grid">
            {recipes.map((recipe) => <article className="recipe-card" key={recipe.id}>
              <button type="button" className="recipe-image-button" onClick={() => openRecipe(recipe.id)} disabled={detailLoading}><img src={recipe.image} alt="" loading="lazy" /><span className="recipe-link">Read recipe &#8594;</span></button>
              <div className="recipe-card-copy"><p className="recipe-type">{recipe.dishTypes?.[0] || 'Recipe'}</p><h2>{recipe.title}</h2><p className="recipe-meta">{recipe.readyInMinutes ? `${recipe.readyInMinutes} min` : 'Recipe details'}{recipe.servings ? ` · ${recipe.servings} servings` : ''}</p></div>
            </article>)}
          </div>
            </>
          )}
          {detailLoading && <p className="detail-loading">Opening your recipe...</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="auth-shell">
      <section className="auth-intro">
        <div className="brand-lockup">
          <div className="brand-mark">M</div>
          <span>mise</span>
        </div>
        <div className="intro-copy">
          <p className="eyebrow">Good food starts here</p>
          <h1>Make room for<br /><em>something delicious.</em></h1>
          <p className="intro-description">Keep your recipes, plans, and favorite flavors in one calm little kitchen.</p>
        </div>
        <div className="ingredient-notes" aria-hidden="true"><span>fresh ideas</span><span>slow mornings</span><span>good company</span></div>
      </section>

      <section className="auth-card">
        <div className="form-heading">
          <p className="eyebrow">Your table awaits</p>
          <h2>{mode === 'login' ? 'Welcome back' : 'Set your place'}</h2>
          <p>{mode === 'login' ? 'Log in to pick up where you left off.' : 'Create an account and start gathering recipes.'}</p>
        </div>
        <div className="mode-switch" role="tablist" aria-label="Authentication mode">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')} role="tab" aria-selected={mode === 'login'}>Log in</button>
          <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')} role="tab" aria-selected={mode === 'signup'}>Sign up</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
          <div className="label-row">
            <label htmlFor="password">Password</label>
            {mode === 'login' && <button type="button" className="text-button" onClick={() => setMessage('Password reset is not configured yet.')}>Forgot password?</button>}
          </div>
          <div className="password-field">
            <input id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" minLength="6" required />
            <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
          </div>
          <button type="submit" className="submit-button" disabled={loading}>{loading ? 'One moment...' : mode === 'login' ? 'Log in to mise' : 'Create my account'} <span aria-hidden="true">&#8594;</span></button>
          {message && <p className="form-message" role="status">{message}</p>}
        </form>
        <p className="legal-copy">By continuing, you agree to our Terms and Privacy Policy.</p>
      </section>
    </main>
  )
}

export default App
