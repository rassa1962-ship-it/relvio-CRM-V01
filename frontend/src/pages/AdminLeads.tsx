import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getAdminLeads, getSpecialists, updateLead, AdminLead, Specialist } from '../api/adminLeads'
import { useTheme } from '../hooks/useTheme'
import { Moon, Sun } from 'lucide-react'

// Статусы
const STATUS_LABELS: Record<string, string> = {
  new: 'Новый',
  contacted: 'В диалоге',
  booked: 'Записан',
  paid: 'Оплачено',
  no_response: 'Не дозвонился',
  declined: 'Отказ'
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-green-100 text-green-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  booked: 'bg-blue-100 text-blue-800',
  paid: 'bg-purple-100 text-purple-800',
  no_response: 'bg-orange-100 text-orange-800',
  declined: 'bg-gray-100 text-gray-800'
}

const CHANNEL_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  email: 'Email',
  phone: 'Телефон',
  in_app: 'In App',
  vk: 'VK',
  other: 'Другое'
}

export default function AdminLeads() {
  const { theme, toggleTheme } = useTheme()
  
  const [leads, setLeads] = useState<AdminLead[]>([])
  const [specialists, setSpecialists] = useState<Specialist[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [channelFilter, setChannelFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Pagination
  const [page, setPage] = useState(0)
  const limit = 20

  useEffect(() => {
    loadSpecialists()
  }, [])

  useEffect(() => {
    loadLeads()
  }, [statusFilter, channelFilter, dateFrom, dateTo, page])

  async function loadSpecialists() {
    try {
      const data = await getSpecialists()
      setSpecialists(data)
    } catch (err) {
      console.error('Failed to load specialists:', err)
    }
  }

  async function loadLeads() {
    setLoading(true)
    setError('')
    try {
      const data = await getAdminLeads({
        status: statusFilter || undefined,
        channel: channelFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit,
        offset: page * limit
      })
      setLeads(data.leads)
      setTotal(data.total)
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  // Optimistic UI - обновляем локально сразу
  async function handleStatusChange(lead: AdminLead, newStatus: string) {
    let price: number | undefined
    
    // При статусе paid запрашиваем сумму
    if (newStatus === 'paid') {
      const input = prompt('Введите сумму оплаты (USD):', lead.price?.toString() || '')
      if (input === null) return // Отмена
      price = parseFloat(input)
      if (isNaN(price)) {
        alert('Неверная сумма')
        return
      }
    }
    
    setLeads(prev => prev.map(l => 
      l.id === lead.id ? { ...l, status: newStatus, price: price ?? l.price } : l
    ))
    try {
      await updateLead(lead.id, { status: newStatus, price })
    } catch (err) {
      // Revert on error
      loadLeads()
      alert('Ошибка обновления статуса')
    }
  }

  async function handleAssignSpecialist(lead: AdminLead, specialistId: string) {
    setLeads(prev => prev.map(l => 
      l.id === lead.id ? { 
        ...l, 
        specialist_id: specialistId || null,
        specialists: specialistId ? specialists.find(s => s.id === specialistId) : undefined
      } : l
    ))
    try {
      await updateLead(lead.id, { specialist_id: specialistId || null })
    } catch (err) {
      loadLeads()
      alert('Ошибка назначения специалиста')
    }
  }

  // Мини-аналитика
  const stats = {
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    booked: leads.filter(l => l.status === 'booked').length,
    paid: leads.filter(l => l.status === 'paid').length,
  }

  // Выручка
  const revenue = leads
    .filter(l => l.status === 'paid')
    .reduce((sum, l) => sum + (l.price || 0), 0)

  // Конверсия
  const allLeadsCount = leads.length
  const leadToContact = allLeadsCount > 0 ? Math.round((stats.contacted / allLeadsCount) * 100) : 0
  const contactToBooked = stats.contacted > 0 ? Math.round((stats.booked / stats.contacted) * 100) : 0
  const bookedToPaid = stats.booked > 0 ? Math.round((stats.paid / stats.booked) * 100) : 0

  const totalPages = Math.ceil(total / limit)

  // Проверка "горячего" лида (score >= 7)
  const isHotLead = (lead: AdminLead) => (lead.meta?.score || 0) >= 7

  // Форматтер контакта
  const formatContact = (lead: AdminLead) => {
    const value = lead.contact_value
    const channel = lead.contact_channel
    
    if (channel === 'phone') {
      return <a href={`tel:${value}`} className="text-blue-600 hover:underline">{value}</a>
    }
    if (channel === 'telegram') {
      const clean = value.replace('@', '')
      return <a href={`https://t.me/${clean}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{value}</a>
    }
    if (channel === 'email') {
      return <a href={`mailto:${value}`} className="text-blue-600 hover:underline">{value}</a>
    }
    return value
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Лиды</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="text-blue-600 hover:underline">
              ← На Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Мини-аналитика */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 p-4 rounded">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{stats.new}</div>
            <div className="text-sm text-green-600 dark:text-green-500">Новые</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 p-4 rounded">
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.contacted}</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-500">В диалоге</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 p-4 rounded">
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.booked}</div>
            <div className="text-sm text-blue-600 dark:text-blue-500">Записаны</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/30 border-l-4 border-purple-500 p-4 rounded">
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{stats.paid}</div>
            <div className="text-sm text-purple-600 dark:text-purple-500">Оплачено</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Статус</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(0) }}
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Все статусы</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Канал</label>
              <select
                value={channelFilter}
                onChange={(e) => { setChannelFilter(e.target.value); setPage(0) }}
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Все каналы</option>
                {Object.entries(CHANNEL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">От даты</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">До даты</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
                className="w-full border rounded px-3 py-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <button
              onClick={() => {
                setStatusFilter('')
                setChannelFilter('')
                setDateFrom('')
                setDateTo('')
                setPage(0)
              }}
              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Сбросить фильтры
            </button>
            <span className="text-gray-600 dark:text-gray-400">Всего: {total} лидов</span>
          </div>
        </div>

        {/* Выручка и конверсия */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Выручка */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-lg p-6">
            <div className="text-sm opacity-90 mb-1">💰 Выручка (текущая выборка)</div>
            <div className="text-3xl font-bold">${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          
          {/* Конверсия */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">📊 Конверсия воронки</div>
            <div className="flex items-center justify-between text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{leadToContact}%</div>
                <div className="text-gray-500 dark:text-gray-400">Лид→Диалог</div>
              </div>
              <div className="text-gray-400">→</div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{contactToBooked}%</div>
                <div className="text-gray-500 dark:text-gray-400">Диалог→Запись</div>
              </div>
              <div className="text-gray-400">→</div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{bookedToPaid}%</div>
                <div className="text-gray-500 dark:text-gray-400">Запись→Оплата</div>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Загрузка...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Лиды не найдены</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Имя</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Контакт</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Канал</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Сегмент</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Специалист</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {leads.map((lead) => (
                  <tr 
                    key={lead.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isHotLead(lead) ? 'border-l-4 border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {new Date(lead.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {lead.meta?.name || '-'}
                      {isHotLead(lead) && (
                        <span className="ml-2 text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300 px-2 py-0.5 rounded">🔥 Hot</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                      {formatContact(lead)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {CHANNEL_LABELS[lead.contact_channel] || lead.contact_channel}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {lead.mh_segment_code}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        value={lead.status}
                        onChange={(e) => handleStatusChange(lead, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer ${STATUS_COLORS[lead.status] || 'bg-gray-100 dark:bg-gray-700'}`}
                      >
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <select
                        value={lead.specialist_id || ''}
                        onChange={(e) => handleAssignSpecialist(lead, e.target.value)}
                        className="text-xs border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="">Не назначен</option>
                        {specialists.map((s) => (
                          <option key={s.id} value={s.id}>{s.full_name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              ←
            </button>
            <span className="px-3 py-1">
              Страница {page + 1} из {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
