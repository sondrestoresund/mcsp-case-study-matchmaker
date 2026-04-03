import { useMemo, useState, useEffect } from 'react'
import { caseStudies, filterGroups } from './data'
import caseStudyDocuments from './caseStudyDocuments.json'
import caseStudyExtracts from './caseStudyExtracts.json'

const siteTitle = 'MCSP Case Study Matchmaker'

const initialFilters = {
  industry: [],
  challenge: [],
  channel: [],
  region: [],
  outcomeType: [],
}

const regionOptions = ['GLOBAL', 'AMERICAS', 'EMEA', 'APAC']

function formatFilterLabel(value) {
  const map = {
    ctv: 'CTV',
    aso: 'ASO',
    ott: 'CTV',
    apac: 'APAC',
    emea: 'EMEA',
    'paid search': 'Paid Search',
    'paid social': 'Paid Social',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    snapchat: 'Snapchat',
    podcast: 'Podcast',
    audio: 'Audio',
    programmatic: 'Programmatic',
    influencers: 'Influencers',
    display: 'Display',
    native: 'Native',
    reddit: 'Reddit',
    'health & wellness': 'Health & Wellness',
    saas: 'SaaS',
    cpg: 'CPG',
  }
  return map[value] || value
}

function normalize(text) {
  return text.toLowerCase().trim()
}

function normalizeForDocMatch(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function scoreCaseStudy(study, filters, query) {
  let score = 0
  const reasons = []

  for (const industry of filters.industry) {
    if (study.industry.includes(industry)) {
      score += 4
      reasons.push(`Industry match: ${formatFilterLabel(industry)}`)
    }
  }

  for (const challenge of filters.challenge) {
    if (study.challenges.includes(challenge)) {
      score += 6
      reasons.push(`Challenge match: ${formatFilterLabel(challenge)}`)
    }
  }

  for (const channel of filters.channel) {
    if (study.channels.includes(channel)) {
      score += 8
      reasons.push(`Channel match: ${formatFilterLabel(channel)}`)
    }
  }

  for (const region of filters.region) {
    if (study.regions.includes(region)) {
      score += 2
      reasons.push(`Region match: ${formatFilterLabel(region)}`)
    }
  }

  for (const outcome of filters.outcomeType) {
    if (study.outcomeTypes.includes(outcome)) {
      score += 5
      reasons.push(`Goal match: ${formatFilterLabel(outcome)}`)
    }
  }

  if (query && query !== '__filters_only__' && query !== '__browse_all__') {
    const weightedFields = [
      { values: study.channels, weight: 8, label: 'Channel match' },
      { values: study.challenges, weight: 7, label: 'Challenge match' },
      { values: study.outcomeTypes, weight: 6, label: 'Goal match' },
      { values: study.industry, weight: 4, label: 'Industry match' },
      { values: study.tags, weight: 4, label: 'Keyword match' },
      { values: study.synonyms || [], weight: 4, label: 'Semantic match' },
      { values: study.competitors, weight: 3, label: 'Comparable brand match' },
      { values: [study.client], weight: 2, label: 'Brand name match' },
      { values: [study.market, study.title, study.summary, study.result], weight: 1, label: 'Context match' },
    ]

    const terms = query
      .toLowerCase()
      .split(/[^a-z0-9&+]+/)
      .map((term) => term.trim())
      .filter((term) => term && term.length > 1)

    const reasonScores = new Map()

    weightedFields.forEach(({ values, weight, label }) => {
      const haystack = values.join(' ').toLowerCase()
      let localHits = 0
      terms.forEach((term) => {
        if (haystack.includes(term)) {
          score += weight
          localHits += 1
        }
      })
      if (localHits > 0) {
        reasonScores.set(label, (reasonScores.get(label) || 0) + localHits * weight)
      }
    })

    const orderedReasons = [...reasonScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label]) => label)

    orderedReasons.forEach((label) => reasons.push(label))
  }

  const hasActiveFiltering =
    filters.industry.length > 0 ||
    filters.challenge.length > 0 ||
    filters.channel.length > 0 ||
    filters.region.length > 0 ||
    filters.outcomeType.length > 0 ||
    (query && query !== '__filters_only__')

  const hasStrongChannelOrChallenge = reasons.some((r) => r.startsWith('Channel match') || r.startsWith('Challenge match') || r.startsWith('Goal match'))
  if (hasActiveFiltering && !hasStrongChannelOrChallenge) {
    score -= 8
  }

  score += Math.max(0, study.year - 2020) * 0.25

  const whySelected = reasons.slice(0, 3)

  return { score, whySelected }
}

function documentScore(study, docTitle) {
  const source = normalizeForDocMatch(docTitle)
  const client = normalizeForDocMatch(study.client)
  const titleTerms = normalizeForDocMatch(study.title).split(' ').filter((word) => word.length > 3)

  let score = 0
  if (source.includes(client)) score += 10
  titleTerms.forEach((term) => {
    if (source.includes(term)) score += 2
  })
  if (source.includes(String(study.year))) score += 2
  return score
}

function findDocumentsForStudy(study) {
  return caseStudyDocuments
    .map((doc) => ({ ...doc, matchScore: documentScore(study, doc.title) }))
    .filter((doc) => doc.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 1)
}

function findExtractsForStudy(study) {
  return caseStudyExtracts
    .map((doc) => ({ ...doc, matchScore: documentScore(study, doc.title) }))
    .filter((doc) => doc.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 1)
}

function buildReadableExcerpt(study) {
  const challenge = study.challenges?.[0] ? formatFilterLabel(study.challenges[0]) : null
  const channelList = (study.channels || []).slice(0, 3).map(formatFilterLabel)
  const channelText = channelList.length > 1
    ? `${channelList.slice(0, -1).join(', ')} and ${channelList.at(-1)}`
    : channelList[0] || 'paid media'

  const industry = study.industry?.[0] ? formatFilterLabel(study.industry[0]) : study.market
  const opening = `${study.client} is a ${industry ? industry.toLowerCase() : ''} brand in ${study.market}.`.replace('  ', ' ')
  const brief = challenge
    ? `The brief was to improve ${challenge.toLowerCase()} through ${channelText.toLowerCase()}.`
    : `The brief was to drive stronger performance through ${channelText.toLowerCase()}.`
  const approach = study.story || study.summary
  const result = study.result ? `Result: ${study.result}.` : ''

  return [opening, brief, approach, result].filter(Boolean).join('\n\n')
}

function getActiveFilterChips(filters, queryActive) {
  const chips = []
  Object.entries(filters).forEach(([group, values]) => {
    values.forEach((value) => {
      chips.push({ group, value, label: `${group === 'outcomeType' ? 'Capability' : group.charAt(0).toUpperCase() + group.slice(1)}: ${formatFilterLabel(value)}` })
    })
  })
  if (queryActive) chips.push({ group: 'query', value: '__query__', label: `Query: ${queryActive}` })
  return chips
}

function App() {
  const [filters, setFilters] = useState(initialFilters)
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [briefMode, setBriefMode] = useState(true)
  const [visibleCount, setVisibleCount] = useState(5)
  const [expandedExcerpt, setExpandedExcerpt] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Real-time debounce for query search
  useEffect(() => {
    const handler = setTimeout(() => {
      setSubmittedQuery(query)
    }, 250)
    return () => clearTimeout(handler)
  }, [query])

  const activeFiltersCount = Object.values(filters).flat().length
  const hasInput = submittedQuery.trim() !== '' || activeFiltersCount > 0
  const effectiveBriefMode = hasInput ? briefMode : false

  const results = useMemo(() => {
    const trimmedQuery = normalize(submittedQuery)

    const ranked = caseStudies
      .map((study) => {
        const { score, whySelected } = scoreCaseStudy(study, filters, trimmedQuery)
        return {
          ...study,
          score,
          whySelected,
          documents: findDocumentsForStudy(study),
          extracts: findExtractsForStudy(study),
        }
      })
      .filter((study) => {
        // If region filters exist, case study must match at least one
        const regionPass = filters.region.length === 0 || filters.region.some(r => study.regions.includes(r.toLowerCase()))
        if (!regionPass) return false
        
        if (!trimmedQuery && activeFiltersCount === 0) return true;
        
        const isBrowseAll = trimmedQuery === '__browse_all__'
        if (isBrowseAll) return true

        const isFilterOnly = trimmedQuery === '__filters_only__'
        if (isFilterOnly) return study.score > 0 || activeFiltersCount > 0

        return study.score > 0
      })
      .sort((a, b) => b.score - a.score)

    const baseResults = effectiveBriefMode ? ranked.slice(0, 3) : ranked
    return effectiveBriefMode ? baseResults : baseResults.slice(0, visibleCount)
  }, [filters, submittedQuery, effectiveBriefMode, activeFiltersCount, visibleCount])

  const toggleFilter = (group, value) => {
    setFilters((current) => {
      const exists = current[group].includes(value)
      return {
        ...current,
        [group]: exists
          ? current[group].filter((item) => item !== value)
          : [...current[group], value],
      }
    })
  }

  const clearFilters = () => {
    setFilters(initialFilters)
    setQuery('')
    setSubmittedQuery('')
    setBriefMode(true)
    setVisibleCount(5)
    setExpandedExcerpt('')
  }

  const removeFilterChip = (group, value) => {
    setVisibleCount(5)
    if (group === 'query') {
      setQuery('')
      setSubmittedQuery('')
      return
    }
    setFilters((current) => ({
      ...current,
      [group]: current[group].filter((item) => item !== value),
    }))
  }

  useEffect(() => {
    setVisibleCount(5)
  }, [submittedQuery, filters, effectiveBriefMode])

  const queryActive = submittedQuery.trim() && submittedQuery !== '__filters_only__' && submittedQuery !== '__browse_all__'
  const activeCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0) + (queryActive ? 1 : 0)
  const activeChips = getActiveFilterChips(filters, queryActive)
  const totalResultsCount = useMemo(() => {
    const trimmedQuery = normalize(submittedQuery)
    return caseStudies
      .map((study) => ({ ...study, score: scoreCaseStudy(study, filters, trimmedQuery).score }))
      .filter((study) => {
        const regionPass = filters.region.length === 0 || filters.region.some(r => study.regions.includes(r.toLowerCase()))
        if (!regionPass) return false
        if (!trimmedQuery && activeFiltersCount === 0) return true
        const isBrowseAll = trimmedQuery === '__browse_all__'
        if (isBrowseAll) return true
        const isFilterOnly = trimmedQuery === '__filters_only__'
        if (isFilterOnly) return study.score > 0 || activeFiltersCount > 0
        return study.score > 0
      }).length
  }, [submittedQuery, filters, activeFiltersCount])

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-grid" />
        <div className="hero-inner">
          <div className="eyebrow">M+C SAATCHI PERFORMANCE</div>
          <h1>{siteTitle}</h1>
          <p className="hero-copy">Find the strongest case study for any brief.</p>
        </div>
      </header>

      <main className="layout single-column-layout">
        <section className="prompt-panel">
          <div className="prompt-shell">
            <div className="panel-kicker">Brief</div>
            <h2>Describe the brief in plain English</h2>
            <p className="prompt-copy">Describe the brand, channel, and goal in plain English.</p>
            <textarea
              id="brand-search"
              className="search-input search-input-large"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`The brand is Dave.com, the scope is CTV and ASO.`}
              rows={5}
            />
            <div className="prompt-actions">
              {hasInput && (
                <button className="ghost-button ghost-button-subtle" onClick={clearFilters}>Clear</button>
              )}
            </div>
          </div>
        </section>

        <section className="filters-panel collapsible-panel">
          <button className="filters-toggle" onClick={() => setFiltersOpen((v) => !v)}>
            <div>
              <div className="panel-kicker">Optional</div>
              <h2>Filters</h2>
            </div>
            <div className="toggle-indicator">{filtersOpen ? '▾' : '▸'}</div>
          </button>

          {filtersOpen && (
            <div className="filters-body">
              {Object.entries(filterGroups).map(([group, values]) => (
                <section key={group} className="filter-group">
                  <div className="filter-title">{group === 'outcomeType' ? 'capability' : group}</div>
                  <div className="chip-wrap">
                    {values.map((value) => {
                      const active = filters[group].includes(value)
                      return (
                        <button
                          key={value}
                          className={`chip ${active ? 'chip-active' : ''}`}
                          onClick={() => toggleFilter(group, value)}
                        >
                          {formatFilterLabel(value)}
                        </button>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>

        <section className="results-panel">
          <div className="results-topbar">
            <div>
              <h2>Matched Case Studies</h2>
            </div>
            <div className="stat-stack">
              <div className="stat-card">
                <span className="stat-label">Active filters</span>
                <span className="stat-value">{activeCount}</span>
              </div>
            </div>
          </div>

          <div className="results-controls">
            <div className="view-mode-switcher">
              <button
                className={`toggle-button ${!effectiveBriefMode ? 'toggle-active' : ''}`}
                onClick={() => setBriefMode(false)}
              >
                All matches
              </button>
              <button
                className={`toggle-button ${effectiveBriefMode ? 'toggle-active' : ''}`}
                onClick={() => setBriefMode(true)}
                disabled={!hasInput}
                title={!hasInput ? "Add a search query or filter to see recommendations" : ""}
              >
                Top 3 recommended
              </button>
            </div>
            {hasInput && (
              <div className="results-helper">Ranked by channel, challenge, goal, and keyword match.</div>
            )}
          </div>

          {activeChips.length > 0 && (
            <div className="active-filters-bar">
              <div className="active-filters-header">
                <span>Active filters</span>
                <button className="ghost-link" onClick={clearFilters}>Clear all</button>
              </div>
              <div className="active-filters-chips">
                {activeChips.map((chip) => (
                  <button key={`${chip.group}-${chip.value}`} className="active-filter-chip" onClick={() => removeFilterChip(chip.group, chip.value)}>
                    <span>{chip.label}</span>
                    <span>×</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.length === 0 ? (
            <div className="empty-results-state">
              <div className="panel-kicker">No case studies found</div>
              <h3>Try adjusting your filters or search terms.</h3>
            </div>
          ) : (
          <>
          <div className="results-grid">
            {results.map((study, index) => (
              <article key={study.id} className={`result-card ${effectiveBriefMode && index === 0 ? 'featured-card' : ''}`}>
                <div className="result-topline">
                  <span className="rank">{String(index + 1).padStart(2, '0')}</span>
                  {effectiveBriefMode && index === 0 && <span className="featured-badge">Best match</span>}
                </div>
                <div className="result-header">
                  <div>
                    <div className="result-client">{study.client}</div>
                    <h3>{study.title}</h3>
                  </div>
                  <div className="header-right">
                    {hasInput && <div className="match-score">{Math.max(1, Math.round(study.score))} match</div>}
                    <div className="year-pill">{study.year}</div>
                  </div>
                </div>
                <p className="best-fit">{study.relevanceHook}</p>
                <p className="summary">{study.summary}</p>
                <div className="result-block">
                  <div className="result-label">Headline result</div>
                  <div className="result-value">{study.result}</div>
                </div>

                {study.story && (
                  <div className="story-block">
                    <div className="result-label">Story</div>
                    <p className="story-text">{study.story}</p>
                  </div>
                )}

                <div className="market-row">
                  <div className="result-label">Market</div>
                  <div className="market-chip">{study.market}</div>
                </div>

                {study.extracts?.[0] && (
                  <div className="excerpt-block">
                    <div className="result-label">Read in app</div>
                    <div className="excerpt-list">
                      {(() => {
                        const doc = study.extracts[0]
                        const isExpanded = expandedExcerpt === doc.path
                        const readableExcerpt = buildReadableExcerpt(study)
                        const preview = readableExcerpt.slice(0, 420)

                        return (
                          <div key={doc.path} className="excerpt-card">
                            <div className="excerpt-title">{study.client} case study summary</div>
                            <p className="excerpt-text">{isExpanded ? readableExcerpt : `${preview}${readableExcerpt.length > 420 ? '…' : ''}`}</p>
                            {readableExcerpt.length > 420 && (
                              <button className="inline-button" onClick={() => setExpandedExcerpt(isExpanded ? '' : doc.path)}>
                                {isExpanded ? 'Show less' : 'Read more'}
                              </button>
                            )}
                            <a className="inline-button" href={doc.path} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', marginLeft: '10px', textDecoration: 'none' }}>
                              Open source PDF
                            </a>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                )}

                {study.documents?.[0] && (
                  <div className="doc-block">
                    <div className="result-label">Read full case study</div>
                    <div className="doc-list">
                      <a className="doc-link" href={study.documents[0].path} target="_blank" rel="noreferrer">
                        <span className="doc-main">
                          <span className="doc-icon">📄</span>
                          <span>{study.documents[0].title}</span>
                        </span>
                        <span className="doc-ext">{study.documents[0].ext.replace('.', '').toUpperCase()}</span>
                      </a>
                    </div>
                  </div>
                )}

                <div className="selection-block">
                  <div className="result-label">Why this was selected</div>
                  <div className="selection-badges">
                    {(study.whySelected?.length ? study.whySelected : [study.relevanceHook]).slice(0, 3).map((item) => (
                      <span key={item} className="selection-badge">{item}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!effectiveBriefMode && results.length < totalResultsCount && (
            <div className="see-more-wrap">
              <button className="see-more-button" onClick={() => setVisibleCount((count) => count + 5)}>
                See 5 more
              </button>
            </div>
          )}
          </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
