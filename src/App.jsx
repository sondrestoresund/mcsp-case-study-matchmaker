import { useMemo, useState } from 'react'
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

function formatFilterLabel(value) {
  const map = {
    ctv: 'CTV',
    aso: 'ASO',
    ott: 'OTT',
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
    dtc: 'DTC',
  }
  return map[value] || value
}

function documentScore(study, docTitle) {
  const source = docTitle.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const client = study.client.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const titleTerms = study.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length > 3)

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
  const channelText =
    channelList.length > 1
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

function getActiveFilterChips(filters) {
  const chips = []
  Object.entries(filters).forEach(([group, values]) => {
    values.forEach((value) => {
      chips.push({
        group,
        value,
        label: `${group === 'outcomeType' ? 'Outcome' : group.charAt(0).toUpperCase() + group.slice(1)}: ${formatFilterLabel(value)}`,
      })
    })
  })
  return chips
}

function App() {
  const [filters, setFilters] = useState(initialFilters)
  const [visibleCount, setVisibleCount] = useState(12)
  const [expandedExcerpt, setExpandedExcerpt] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(true)

  const activeFiltersCount = Object.values(filters).flat().length
  const hasActiveFilters = activeFiltersCount > 0

  const results = useMemo(() => {
    const ranked = caseStudies
      .filter((study) => {
        if (filters.region.length > 0 && !filters.region.some((region) => study.regions.includes(region))) {
          return false
        }
        if (filters.industry.length > 0 && !filters.industry.some((industry) => study.industry.includes(industry))) {
          return false
        }
        if (filters.challenge.length > 0 && !filters.challenge.some((challenge) => study.challenges.includes(challenge))) {
          return false
        }
        if (filters.channel.length > 0 && !filters.channel.some((channel) => study.channels.includes(channel))) {
          return false
        }
        if (filters.outcomeType.length > 0 && !filters.outcomeType.some((outcome) => study.outcomeTypes.includes(outcome))) {
          return false
        }
        return true
      })
      .map((study) => {
        const whySelected = []
        filters.industry.forEach((industry) => {
          if (study.industry.includes(industry)) whySelected.push(`Industry: ${formatFilterLabel(industry)}`)
        })
        filters.challenge.forEach((challenge) => {
          if (study.challenges.includes(challenge)) whySelected.push(`Challenge: ${formatFilterLabel(challenge)}`)
        })
        filters.channel.forEach((channel) => {
          if (study.channels.includes(channel)) whySelected.push(`Channel: ${formatFilterLabel(channel)}`)
        })
        filters.region.forEach((region) => {
          if (study.regions.includes(region)) whySelected.push(`Region: ${formatFilterLabel(region)}`)
        })
        filters.outcomeType.forEach((outcome) => {
          if (study.outcomeTypes.includes(outcome)) whySelected.push(`Outcome: ${formatFilterLabel(outcome)}`)
        })

        return {
          ...study,
          whySelected,
          documents: findDocumentsForStudy(study),
          extracts: findExtractsForStudy(study),
        }
      })
      .sort((a, b) => b.year - a.year || a.client.localeCompare(b.client))

    return ranked.slice(0, visibleCount)
  }, [filters, visibleCount])

  const totalResultsCount = useMemo(() => {
    return caseStudies.filter((study) => {
      if (filters.region.length > 0 && !filters.region.some((region) => study.regions.includes(region))) return false
      if (filters.industry.length > 0 && !filters.industry.some((industry) => study.industry.includes(industry))) return false
      if (filters.challenge.length > 0 && !filters.challenge.some((challenge) => study.challenges.includes(challenge))) return false
      if (filters.channel.length > 0 && !filters.channel.some((channel) => study.channels.includes(channel))) return false
      if (filters.outcomeType.length > 0 && !filters.outcomeType.some((outcome) => study.outcomeTypes.includes(outcome))) return false
      return true
    }).length
  }, [filters])

  const toggleFilter = (group, value) => {
    setVisibleCount(12)
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
    setVisibleCount(12)
    setExpandedExcerpt('')
  }

  const removeFilterChip = (group, value) => {
    setVisibleCount(12)
    setFilters((current) => ({
      ...current,
      [group]: current[group].filter((item) => item !== value),
    }))
  }

  const activeChips = getActiveFilterChips(filters)

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-grid" />
        <div className="hero-inner">
          <div className="eyebrow">M+C SAATCHI PERFORMANCE</div>
          <h1>{siteTitle}</h1>
          <p className="hero-copy">Use the filters to find the most relevant case studies for a brief.</p>
        </div>
      </header>

      <main className="layout single-column-layout">
        <section className="prompt-panel">
          <div className="prompt-shell">
            <div className="panel-kicker">How to use</div>
            <h2>Filter the library</h2>
            <p className="prompt-copy">Start with the few filters that matter most. Results only appear when the selected case study explicitly matches those labels.</p>
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
                  <div className="filter-title">{group === 'outcomeType' ? 'outcome' : group}</div>
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
                <span className="stat-value">{activeFiltersCount}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Results</span>
                <span className="stat-value">{totalResultsCount}</span>
              </div>
            </div>
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

          {!hasActiveFilters ? (
            <div className="empty-results-state">
              <div className="panel-kicker">Choose filters to begin</div>
              <h3>Select one or more filters to narrow the case study set.</h3>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-results-state">
              <div className="panel-kicker">No case studies found</div>
              <h3>Try removing one filter or broadening the brief.</h3>
            </div>
          ) : (
            <>
              <div className="results-grid">
                {results.map((study, index) => (
                  <article key={study.id} className="result-card">
                    <div className="result-topline">
                      <span className="rank">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="result-header">
                      <div>
                        <div className="result-client">{study.client}</div>
                        <h3>{study.title}</h3>
                      </div>
                      <div className="header-right">
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

                    {study.whySelected.length > 0 && (
                      <div className="selection-block">
                        <div className="result-label">Matched filters</div>
                        <div className="selection-badges">
                          {study.whySelected.slice(0, 5).map((item) => (
                            <span key={item} className="selection-badge">{item}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
              {results.length < totalResultsCount && (
                <div className="see-more-wrap">
                  <button className="see-more-button" onClick={() => setVisibleCount((count) => count + 12)}>
                    See 12 more
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
