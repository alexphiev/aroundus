'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Info } from 'lucide-react'

interface PlaceRecommendationProps {
  whyRecommended: string
}

export default function PlaceRecommendation({
  whyRecommended,
}: PlaceRecommendationProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Info className="h-5 w-5" />
          Why We Recommend This Place
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {whyRecommended}
        </p>
      </CardContent>
    </Card>
  )
}
