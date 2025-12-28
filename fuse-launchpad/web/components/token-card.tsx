'use client';

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Crown, TrendingUp, User, Zap } from "lucide-react";
import Image from "next/image";

interface TokenCardProps {
  name: string;
  ticker: string;
  creator: string;
  marketCap: string;
  progress: number;
  mint: string;
  image?: string;
  isKing?: boolean;
}

export function TokenCard({ name, ticker, creator, marketCap, progress, mint, image, isKing }: TokenCardProps) {
  return (
    <Card className="overflow-hidden bg-gradient-to-b from-card to-black/50 border-border/30 hover:border-blue-500/50 transition-all duration-500 cursor-pointer group hover-lift relative">
      {/* Glow overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      
      <CardHeader className="p-0 relative aspect-square overflow-hidden">
        {/* Image/Placeholder */}
        <div className="w-full h-full bg-gradient-to-br from-muted to-black flex items-center justify-center text-muted-foreground relative">
          {image ? (
            <div className="relative w-full h-full">
              <Image 
                src={image} 
                alt={name} 
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority={isKing}
              />
            </div>
          ) : (
            <div className="relative">
              <span className="text-6xl font-black opacity-10 group-hover:opacity-20 transition-opacity">{ticker}</span>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <Zap className="w-8 h-8 text-blue-400" />
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* King Badge */}
        {isKing && (
          <div className="absolute top-3 right-3 animate-bounce-subtle">
            <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-bold border-none shadow-lg shadow-yellow-500/30 flex items-center gap-1.5 px-3 py-1">
              <Crown className="h-3.5 w-3.5" />
              King
            </Badge>
          </div>
        )}

        {/* Live indicator */}
        <div className="absolute top-3 left-3">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 border border-green-500/30">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-400">Live</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-4 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-lg leading-tight group-hover:text-blue-400 transition-colors">{name}</h3>
            <p className="text-sm text-blue-400 font-mono mt-0.5">${ticker}</p>
          </div>
          <Badge variant="outline" className="font-mono text-xs border-blue-500/30 text-blue-400 bg-blue-500/10">
            <TrendingUp className="h-3 w-3 mr-1" />
            {marketCap}
          </Badge>
        </div>

        {/* Creator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/20">
            <User className="h-3 w-3 text-blue-400" />
          </div>
          <span>Created by <span className="text-blue-400 font-mono">{creator}</span></span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Bonding Curve</span>
            <span className="font-bold text-blue-400">{progress}%</span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-2 bg-muted/50" />
            {progress >= 90 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

