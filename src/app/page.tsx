'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Clock, Calculator, Trash2, Star, HelpCircle, Copy } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useToast } from '@/hooks/use-toast'

interface TimeEntry {
  id: string
  input: string
  startTime: string
  endTime: string
  hours: number
  minutes: number
  isValid: boolean
  error?: string
}

export default function TimeCalculator() {
  const [inputText, setInputText] = useState('')
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [totalHours, setTotalHours] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const [points, setPoints] = useState<number | null>(null)
  const [showPoints, setShowPoints] = useState(false)
  const [formatMode, setFormatMode] = useState<'smart' | 'unordered' | 'normalize' | 'extract' | 'trim'>('smart')

  // 自定义格式化模板
  const DEFAULT_TEMPLATE = '总共时间为：{{TotalTime}}，有 {{points}} 待结算'
  const [customTemplate, setCustomTemplate] = useState<string>(DEFAULT_TEMPLATE)
  const templateRef = useRef<HTMLTextAreaElement | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    try {
      const saved = localStorage.getItem('timecalc.customTemplate')
      if (saved) {
        const OLD_DEFAULT = '总共时间为：{{TotalTime}}，总积分为{{points}}'
        if (saved === OLD_DEFAULT) {
          setCustomTemplate(DEFAULT_TEMPLATE)
          localStorage.setItem('timecalc.customTemplate', DEFAULT_TEMPLATE)
        } else {
          setCustomTemplate(saved)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('timecalc.customTemplate', customTemplate)
    } catch {}
  }, [customTemplate])

  // 文本整理工具
  const pad2 = (n: number | string) => String(n).padStart(2, '0')
  const timeRangeRegex = /(\d{1,2})[：:](\d{1,2})\s*(?:-|–|—|~|～|to|至)\s*(\d{1,2})[：:](\d{1,2})/g

  const cleanUnorderedList = (text: string) => {
    return text
      .split('\n')
      .map((line) =>
        line
          // 任务列表 - [ ] / - [x]
          .replace(/^\s*(?:[-*+•·]\s+\[(?:\s|x|X)\]\s+|[-*+•·]\s+)/, '')
      )
      .join('\n')
  }

  const normalizeTimeRanges = (text: string) => {
    return text.replace(timeRangeRegex, (_m, a, b, c, d) => {
      const sh = Math.min(23, parseInt(a))
      const sm = Math.min(59, parseInt(b))
      const eh = Math.min(23, parseInt(c))
      const em = Math.min(59, parseInt(d))
      return `${pad2(sh)}:${pad2(sm)} - ${pad2(eh)}:${pad2(em)}`
    })
  }

  const extractTimeRangesLines = (text: string) => {
    return text
      .split('\n')
      .map((line) => {
        const m = Array.from(line.matchAll(timeRangeRegex))
        if (m.length === 0) return ''
        const [, a, b, c, d] = m[0]
        const sh = Math.min(23, parseInt(a))
        const sm = Math.min(59, parseInt(b))
        const eh = Math.min(23, parseInt(c))
        const em = Math.min(59, parseInt(d))
        return `${pad2(sh)}:${pad2(sm)} - ${pad2(eh)}:${pad2(em)}`
      })
      .filter(Boolean)
      .join('\n')
  }

  const removeEmptyLines = (text: string) => text.split('\n').filter((l) => l.trim() !== '').join('\n')

  const formatInput = () => {
    let text = inputText
    switch (formatMode) {
      case 'unordered':
        text = cleanUnorderedList(text)
        break
      case 'normalize':
        text = normalizeTimeRanges(text)
        break
      case 'extract':
        text = extractTimeRangesLines(text)
        break
      case 'trim':
        text = removeEmptyLines(text)
        break
      case 'smart':
      default:
        // 智能清理：去无序列表 -> 规范化 -> 仅保留时间 -> 去空行
        text = removeEmptyLines(extractTimeRangesLines(normalizeTimeRanges(cleanUnorderedList(text))))
        break
    }
    setInputText(text)
  }

  const parseTimeLine = (line: string): TimeEntry | null => {
    const trimmedLine = line.trim()
    if (!trimmedLine) return null

    // 匹配格式: hh:mm - hh:mm
    const timeRegex = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/
    const match = trimmedLine.match(timeRegex)

    if (!match) {
      return {
        id: Math.random().toString(36).substr(2, 9),
        input: trimmedLine,
        startTime: '',
        endTime: '',
        hours: 0,
        minutes: 0,
        isValid: false,
        error: '格式错误，请使用 hh:mm - hh:mm 格式'
      }
    }

    const [, startHour, startMin, endHour, endMin] = match.map(Number)
    
    // 验证时间
    if (startHour > 23 || startMin > 59 || endHour > 23 || endMin > 59) {
      return {
        id: Math.random().toString(36).substr(2, 9),
        input: trimmedLine,
        startTime: '',
        endTime: '',
        hours: 0,
        minutes: 0,
        isValid: false,
        error: '时间值无效，小时应为0-23，分钟应为0-59'
      }
    }

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    // 支持跨天：若结束时间小于开始时间，视为次日
    let crossDay = false
    let endTotalMinutes = endMinutes
    if (endMinutes < startMinutes) {
      crossDay = true
      endTotalMinutes = endMinutes + 24 * 60
    }

    const diffMinutes = endTotalMinutes - startMinutes
    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    return {
      id: Math.random().toString(36).substr(2, 9),
      input: trimmedLine,
      startTime: `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`,
      endTime: `${crossDay ? '次日 ' : ''}${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`,
      hours,
      minutes,
      isValid: true
    }
  }

  const calculateTimes = () => {
    const lines = inputText.split('\n')
    const parsedEntries: TimeEntry[] = []
    
    lines.forEach(line => {
      const entry = parseTimeLine(line)
      if (entry) {
        parsedEntries.push(entry)
      }
    })

    setEntries(parsedEntries)
  }

  useEffect(() => {
    const total = entries.reduce((acc, entry) => {
      if (entry.isValid) {
        return acc + entry.hours * 60 + entry.minutes
      }
      return acc
    }, 0)

    setTotalHours(Math.floor(total / 60))
    setTotalMinutes(total % 60)
  }, [entries])

  const clearAll = () => {
    setInputText('')
    setEntries([])
    setTotalHours(0)
    setTotalMinutes(0)
    setPoints(null)
    setShowPoints(false)
  }

  const removeEntry = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id))
  }

  const calculatePoints = () => {
    const totalMinutesInTime = totalHours * 60 + totalMinutes
    
    console.log('计算积分 - 总时间:', totalHours, '小时', totalMinutes, '分钟')
    console.log('总分钟数:', totalMinutesInTime)
    
    if (totalMinutesInTime === 0) {
      setPoints(null)
      setShowPoints(false)
      return
    }

    // 积分计算：起步6积分，每多1h则加2积分
    // 不足1h的分钟数按下一顺位的积分乘以 m/60 的比例
    let totalPoints = 6 // 起步积分
    const remainingMinutes = totalMinutesInTime - 60 // 减去第一个小时
    
    console.log('剩余分钟数:', remainingMinutes)
    
    if (remainingMinutes > 0) {
      const fullHours = Math.floor(remainingMinutes / 60)
      const extraMinutes = remainingMinutes % 60
      
      console.log('完整小时数:', fullHours, '额外分钟数:', extraMinutes)
      
      // 计算完整小时的积分
      for (let i = 1; i <= fullHours; i++) {
        const hourPoints = 6 + (i * 2)
        totalPoints += hourPoints
        console.log(`第${i+1}小时积分:`, hourPoints, '累计积分:', totalPoints)
      }
      
      // 计算不足1小时的分钟数的积分
      if (extraMinutes > 0) {
        const nextHourPoints = 6 + ((fullHours + 1) * 2)
        const partialPoints = nextHourPoints * (extraMinutes / 60)
        totalPoints += partialPoints
        console.log('不足1小时积分:', partialPoints, '最终积分:', totalPoints)
      }
    }
    
    const finalPoints = Math.round(totalPoints * 100) / 100
    console.log('设置积分:', finalPoints)
    setPoints(finalPoints)
    setShowPoints(true)
  }

  // ===== 自定义格式化：渲染与复制 =====
  const formatPointsNumber = (n: number) => {
    const s = n.toFixed(2)
    return s.replace(/\.00$/, '').replace(/(\.\d*[1-9])0$/, '$1')
  }

  const formatTotalTimeEn = (h: number, m: number) => {
    const parts: string[] = []
    if (h) parts.push(`${h}h`)
    if (m) parts.push(`${m}m`)
    if (parts.length === 0) return '0m'
    return parts.join('')
  }

  const formatTotalTimeZh = (h: number, m: number) => {
    const parts: string[] = []
    if (h) parts.push(`${h}小时`)
    if (m) parts.push(`${m}分钟`)
    if (parts.length === 0) return '0分钟'
    return parts.join('')
  }

  const totalValidRangeCount = useMemo(() => entries.filter(e => e.isValid).length, [entries])
  const totalMinutesAll = useMemo(() => totalHours * 60 + totalMinutes, [totalHours, totalMinutes])

  const renderTemplate = useMemo(() => {
    const unknown = new Set<string>()
    const mapping: Record<string, string | number> = {}
    mapping['totaltime'] = formatTotalTimeEn(totalHours, totalMinutes)
    mapping['TotalTime'] = formatTotalTimeZh(totalHours, totalMinutes)
    mapping['hours'] = totalHours
    mapping['minutes'] = totalMinutes
    if (points !== null) {
      const p = formatPointsNumber(points)
      mapping['points'] = p
      mapping['totalPoints'] = p
      mapping['Points'] = `${p}积分`
    }
    mapping['rangeCount'] = totalValidRangeCount
    mapping['totalMinutes'] = totalMinutesAll

    const re = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g
    const text = customTemplate.replace(re, (_m, key: string) => {
      if (Object.prototype.hasOwnProperty.call(mapping, key)) {
        return String(mapping[key])
      } else {
        unknown.add(key)
        return `{{${key}}}`
      }
    })
    return { text, unknown: Array.from(unknown) }
  }, [customTemplate, totalHours, totalMinutes, points, totalValidRangeCount, totalMinutesAll])

  const insertVariable = (name: string) => {
    const token = `{{${name}}}`
    const el = templateRef.current
    if (!el) {
      setCustomTemplate((t) => t + token)
      return
    }
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const next = customTemplate.slice(0, start) + token + customTemplate.slice(end)
    setCustomTemplate(next)
    setTimeout(() => {
      el.focus()
      const cursor = start + token.length
      el.setSelectionRange(cursor, cursor)
    }, 0)
  }

  const handleCopy = async () => {
    const text = renderTemplate.text
    try {
      await navigator.clipboard.writeText(text)
      toast({ title: '已复制到剪贴板' })
    } catch {
      try {
        const area = document.createElement('textarea')
        area.value = text
        area.style.position = 'fixed'
        area.style.left = '-9999px'
        document.body.appendChild(area)
        area.focus()
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
        toast({ title: '已复制到剪贴板' })
      } catch {
        toast({ title: '复制失败，请手动选择复制' })
      }
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">时间计算器</h1>
          </div>
          <p className="text-muted-foreground">
            输入时间段格式：hh:mm - hh:mm，每行一个
          </p>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              时间输入
            </CardTitle>
            <CardDescription>
              请输入时间段，每行一个，格式如：09:30 - 17:45
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="例如：&#10;09:30 - 17:45&#10;13:00 - 14:30&#10;18:20 - 21:00"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="min-h-32 font-mono"
            />
            <div className="flex items-center gap-2">
              <div className="w-56">
                <Select value={formatMode} onValueChange={(v) => setFormatMode(v as any)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="选择清理模式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="smart">智能清理（推荐）</SelectItem>
                    <SelectItem value="unordered">清理无序列表</SelectItem>
                    <SelectItem value="normalize">规范化时间格式</SelectItem>
                    <SelectItem value="extract">仅提取时间段</SelectItem>
                    <SelectItem value="trim">移除空行</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="secondary" onClick={formatInput}>格式化</Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={calculateTimes} className="flex-1">
                计算时间
              </Button>
              <Button variant="outline" onClick={clearAll}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {entries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>计算结果</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {entries.map((entry, index) => (
                  <div key={entry.id}>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            #{index + 1}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {entry.input}
                          </span>
                        </div>
                        {entry.isValid ? (
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-muted-foreground">
                              {entry.startTime} → {entry.endTime}
                            </span>
                            <Badge variant="secondary" className="font-mono">
                              {entry.hours}时{entry.minutes}分
                            </Badge>
                          </div>
                        ) : (
                          <div className="text-sm text-destructive">
                            {entry.error}
                          </div>
                        )}
                      </div>
                      {entry.isValid && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEntry(entry.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {index < entries.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total Section */}
        {entries.some(entry => entry.isValid) && (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                总计时间
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary font-mono">
                  {totalHours}时{totalMinutes}分
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  共 {entries.filter(e => e.isValid).length} 个有效时间段
                </div>
                <div className="mt-4">
                  <Button 
                    onClick={calculatePoints}
                    disabled={totalHours === 0 && totalMinutes === 0}
                    className="w-full"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    计算积分
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Points Section */}
        {showPoints && points !== null && (
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Star className="h-5 w-5" />
                积分计算结果
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-3">
                <div className="text-3xl font-bold text-orange-600 font-mono">
                  {points} 积分
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>积分规则：起步6积分，每多1小时加2积分</div>
                  <div>不足1小时按比例计算</div>
                </div>
                <div className="text-xs text-muted-foreground bg-white/50 p-2 rounded">
                  计算示例：2h30m = 6 + 8 + 10×0.5 = 19积分
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {showPoints && points !== null && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                自定义格式化
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="使用提示">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-xs leading-5">
                    <div className="font-medium mb-1">使用提示</div>
                    <div className="space-y-1 text-muted-foreground">
                      <div>支持占位符（区分大小写）：</div>
                      <div className="font-mono">{`{{totaltime}}`} / {`{{TotalTime}}`} / {`{{hours}}`} / {`{{minutes}}`}</div>
                      <div className="font-mono">{`{{points}}`} / {`{{totalPoints}}`} / {`{{Points}}`}</div>
                      <div className="font-mono">{`{{rangeCount}}`} / {`{{totalMinutes}}`}</div>
                      <div>示例：总共时间为：{`{{TotalTime}}`}，总积分为{`{{points}}`}</div>
                      <div>时长零项将被省略（例：3小时、15分钟）。</div>
                    </div>
                  </PopoverContent>
                </Popover>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {['totaltime','TotalTime','points','Points','hours','minutes','rangeCount','totalMinutes'].map(k => (
                  <Button key={k} size="sm" variant="outline" onClick={() => insertVariable(k)}>
                    {`{{${k}}}`}
                  </Button>
                ))}
              </div>
              <Textarea
                ref={templateRef}
                value={customTemplate}
                onChange={(e) => setCustomTemplate(e.target.value)}
                className="min-h-20 font-mono"
              />
              <div>
                <div className="text-sm text-muted-foreground mb-1">预览</div>
                <div className="p-2 bg-muted rounded font-mono whitespace-pre-wrap break-words">
                  {renderTemplate.text}
                </div>
                {renderTemplate.unknown.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">未知变量：{renderTemplate.unknown.join(', ')}</div>
                )}
                <div className="mt-2 flex justify-end">
                  <Button onClick={handleCopy} size="sm">
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Examples */}
        <Card>
          <CardHeader>
            <CardTitle>使用示例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="p-2 bg-muted rounded font-mono">
                09:30 - 17:45
              </div>
              <div className="p-2 bg-muted rounded font-mono">
                13:00 - 14:30
              </div>
              <div className="p-2 bg-muted rounded font-mono">
                18:20 - 21:00
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
