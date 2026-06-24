import { useEffect, useState } from "react";
import { API } from "../config/axios";

export const useDashboard = () => {
  const [stats, setStats]             = useState(null);
  const [overview, setOverview]       = useState(null);
  const [recentSubs, setRecentSubs]   = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [statsRes, subsRes, recRes, overviewRes] = await Promise.all([
          API.get("/user/stats"),
          API.get("/user/submissions/recent"),
          API.get("/problemSet/recommended"),
          API.get("/problemSet/stats/overview"),
        ]);
        setStats(statsRes.data.stats);
        setRecentSubs(subsRes.data.submissions);
        setRecommended(recRes.data.problems);
        setOverview(overviewRes.data.data);   // { byDifficulty, totalCount, ... }
      } catch (err) {
        console.error("Dashboard fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return { stats, overview, recentSubs, recommended, loading };
};