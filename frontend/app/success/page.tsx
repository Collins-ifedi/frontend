"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Crown, Loader2 } from "lucide-react"

export default function SuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [subscriptionData, setSubscriptionData] = useState<any>(null)

  useEffect(() => {
    const sessionId = searchParams.get("session_id")
    if (sessionId) {
      // In a real implementation, you would verify the session with LemonSqueezy
      // For now, we'll simulate success
      setTimeout(() => {
        setSubscriptionData({
          plan: "Pro",
          status: "active",
        })
        setIsLoading(false)
      }, 2000)
    } else {
      setIsLoading(false)
    }
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
              <p className="text-gray-600 dark:text-gray-400">Processing your subscription...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl text-green-600">Subscription Successful!</CardTitle>
          <CardDescription>Welcome to Voxaroid {subscriptionData?.plan}</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-center mb-2">
              <Crown className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="font-semibold">Premium Features Unlocked</span>
            </div>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>✓ Unlimited messages</li>
              <li>✓ Advanced AI models</li>
              <li>✓ Priority support</li>
              <li>✓ File analysis</li>
            </ul>
          </div>
          <Button onClick={() => router.push("/")} className="w-full">
            Start Chatting
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
