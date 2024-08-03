import React from 'https://esm.sh/react@18.2.0'
import { ImageResponse } from 'https://deno.land/x/og_edge@0.0.4/mod.ts'

import { createClient } from "jsr:@supabase/supabase-js@2";

// Initialize Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fetchItemDetailsAndDisplay(id) {
  // Query the item table
  let { data: itemData, error: itemError } = await supabase
    .from('item')
    .select('title, image_url, feed_id, website_content')
    .eq('id', id)
    .single()

  if (itemError) throw new Error(itemError.message)

  // Query the feed table
  let { data: feedData, error: feedError } = await supabase
    .from('feed')
    .select('title')
    .eq('id', itemData.feed_id)
    .single()

  if (feedError) throw new Error(feedError.message)

  let relatedMarkets = 0
  try {
    // Make a POST request to get related markets
    const response = await fetch('https://fyeyeurwgxklumxgpcgz.supabase.co/functions/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: itemData.title })
    })

    const markets = await response.json()

    const numberOfMarkets = await supabase.rpc('match_documents', {
      query_embedding: markets["embedding"], // pass the query embedding
      match_threshold: 0.803, // choose an appropriate threshold for your data
      match_count: 3, // choose the number of matches
    })

    relatedMarkets = numberOfMarkets["data"].length
  } catch(error) {
    console.log("Related Markets Error: ", error)
  }

  // Return ImageResponse
  return new ImageResponse(
    <div style={{
      fontFamily: 'Inter, sans-serif',
      fontSize: '16px',
      fontWeight: 400,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: '#ffffff',
      padding: '20px',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>
       <img 
          src={itemData.image_url || 'https://source.boringavatars.com/marble/120?square'} 
          alt="Article Image" 
          onError={(e) => e.currentTarget.src = 'https://source.boringavatars.com/marble/120?square'}
          width="750"
          height="256"
          style={{
            objectFit: 'fit',
            borderRadius: '8px',
          }}
        />

        <div style={{
          marginTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '40%',
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#000000',
            margin: '0 0 12px 0',
            lineHeight: 1.2,
          }}>
            {itemData.title}
          </h1>

          <span style={{
            fontSize: '14px',
            color: '#757575',
            marginBottom: '8px',
            textDecoration: 'underline',
            textDecorationStyle: 'dotted'
          }}>
            {relatedMarkets} related prediction markets
          </span>

          <p style={{
            fontSize: '16px',
            color: '#4A4A4A',
            margin: '0 0 16px 0',
            lineHeight: 1.4,
          }}>
            {`${itemData.website_content.substring(0, 120)}...`}
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{
              fontSize: '14px',
              color: '#757575',
              marginBottom: '8px',
            }}>
              <span style={{ marginRight: '4px' }}><strong>adj.news</strong></span>via {feedData.title}
            </span>
          </div>
        </div>
      </div>
    </div>,
    {
      width: 800,
      height: 500,
    }
  )
}

export default async function handler(req: Request) {
  const id = req.url.split('?')[1].split("=")[1];
  if (!id) {
    return new Response("Adjacent News");
  }
  return fetchItemDetailsAndDisplay(id);
}