import { ref, watch } from 'vue'
import { configureJira } from '@/services/jiraApi'
import { configureBitbucket } from '@/services/bitbucketApi'

const STORAGE_KEY = 'jira_assessment_config'

const defaultConfig = () => ({
  jira: { baseUrl: '', username: '', token: '' },
  bitbucket: { baseUrl: '', username: '', token: '', projectKey: '' },
  members: [],       // [{ enName, displayName }]
  repoSlugs: [],     // Bitbucket repo slugs
})

export function useConfig() {
  const config = ref(loadConfig())

  function loadConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return { ...defaultConfig(), ...JSON.parse(raw) }
    } catch {}
    return defaultConfig()
  }

  function saveConfig() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value))
    applyConfig()
  }

  function applyConfig() {
    const { jira, bitbucket } = config.value
    if (jira.baseUrl && jira.username && jira.token) {
      configureJira(jira)
    }
    if (bitbucket.baseUrl && bitbucket.username && bitbucket.token) {
      configureBitbucket(bitbucket)
    }
  }

  // 啟動時套用
  applyConfig()

  return { config, saveConfig }
}
