'use client'

import { useState } from 'react'

interface Props {
  shareUrl: string
  sharedName: string | null
  onSaveShared: () => void
}

export default function RetirementSharePanel({ shareUrl, sharedName, onSaveShared }: Props) {
  const [message, setMessage] = useState<string | null>(null)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setMessage('分享連結已複製')
    } catch {
      setMessage('無法自動複製，請從網址列手動複製')
    }
  }

  return (
    <section className="card share-card">
      <h2>分享目前假設</h2>
      <p className="hint">連結只包含輸入參數，不會上傳資料或建立帳號。</p>
      <div className="share-actions">
        <button className="button-primary" onClick={copyLink}>複製分享連結</button>
        {message && <span className="share-message">{message}</span>}
      </div>
      {sharedName && (
        <div className="import-callout">
          <p>你正在查看分享情境：<strong>{sharedName}</strong></p>
          <button className="button-secondary" onClick={onSaveShared}>存成我的本機情境</button>
        </div>
      )}
    </section>
  )
}
