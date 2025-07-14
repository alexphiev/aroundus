import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlaceResultItem } from '@/types/result.types'
import { Info } from 'lucide-react'

interface Props {
  place: PlaceResultItem
}

export default function PlaceCurrentConditions({ place }: Props) {
  if (!place.currentConditions) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Current Conditions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-3">
          <Info className="h-6 w-6 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium">Latest Updates</p>
            <p className="text-sm text-muted-foreground">
              {place.currentConditions}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
