/* eslint-disable no-underscore-dangle */ // We use this because we have the _unit property
/* eslint-disable sonarjs/no-duplicate-string */ // Make things easier to read

import React, { useMemo, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
} from "material-react-table";
import {
  IconButton,
  Tooltip,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Button,
  Collapse,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoIcon from "@mui/icons-material/Info";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { Category, Drug } from "tripsit_drug_db";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import Grid from "@mui/material/Grid";
import KofiButton from "kofi-button";
import PatreonButton from "./Patreon";
import GithubButton from "./Github";
import DrugInfoCard from "./DrugInfo";
import addDictionaryDefs from "./addDictionaryDefs";
import dictionary from "../assets/dictionary.json";
import AOS from "aos";
import "aos/dist/aos.css";
import Header from "../components/Header";
import Footer from "../components/Footer";

// Dynamically import ParticlesBg to prevent SSR errors
const AnimatedBg = dynamic(() => import("particles-bg"), {
  ssr: false,
});

// Info Panel with the transparent purple background
const FactsheetInfoPanel = () => (
  <Grid item key="factsheetInfo" mt={2}>
    <Card
      sx={{
        backgroundColor: "rgba(18, 18, 20, 0.8)", // Darker background
        color: "#eee",
        border: `2px solid #4a4de2`, // Using theme primary color
      }}
    >
      <CardContent>
        <Grid container spacing={2}>
          <Grid item xs={12} md={9}>
            <Typography
              sx={{ color: "white", textShadow: "0 0 5px rgba(0,0,0,0.8)" }}
            >
              TripSit&apos;s factsheets are meticulously crafted to deliver
              clear, concise, and reliable information about various substances.
              Primarily designed for educational purposes, these factsheets
              should not be interpreted as medical advice.
              <br />
              <br />
              <b>
                Your safety is paramount. We encourage you to verify information
                from multiple sources before making decisions about substance
                use.
              </b>
              <br />
              <br />
              The content is sourced from our comprehensive{" "}
              <a href="https://github.com/tripsit/drugs">drug database</a>. If
              you notice something that needs updating, please{" "}
              <a href="https://github.com/TripSit/drugs/issues/new?assignees=LunaUrsa&labels=&projects=&template=drug-change.md&title=Update+<drug>+to+<details>">
                submit an issue
              </a>{" "}
              along with your sources.
            </Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Grid container direction={{ xs: "row", md: "column" }} spacing={2}>
              <Grid item>
                <KofiButton
                  color="#0a9396"
                  title="TripSit Ko-Fi"
                  kofiID="J3J5NOJCE"
                />
              </Grid>
              <Grid item>
                <PatreonButton />
              </Grid>
              <Grid item>
                <GithubButton />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  </Grid>
);

const addCategoryStyle = (text: string | undefined) => {
  if (text === undefined) {
    return "";
  }
  const categoryColors = {
    psychedelic: { backgroundColor: "#00A388" },
    opioid: { backgroundColor: "#C0D9AF" },
    stimulant: { backgroundColor: "#31B0D5" },
    dissociative: { backgroundColor: "#9b59b6" },
    benzodiazepine: { backgroundColor: "#bd07c2" },
    "research-chemical": { backgroundColor: "#EC971F" },
    "habit-forming": { backgroundColor: "#e67e22" },
    depressant: { backgroundColor: "#C9302C" },
    tentative: { backgroundColor: "#FFFF9D", color: "#001713" },
  } as { [key in Category]: { backgroundColor: string; color?: string } };
  const words = text.split(" ");
  return words.map((word) => {
    const cleanWord = word.replace(/,/g, "").toLowerCase();
    if (Object.keys(categoryColors).includes(cleanWord)) {
      const colorDef = categoryColors[cleanWord as keyof typeof categoryColors];
      const definition = dictionary[cleanWord as keyof typeof dictionary];
      return (
        <Tooltip arrow disableInteractive key={cleanWord} title={definition}>
          <Typography
            className="transition-all hover:brightness-110"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: "24px",
              color: colorDef.color ?? "white",
              fontSize: "inherit",
              fontFamily: "inherit",
              background: colorDef.backgroundColor,
              boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.25)",
              padding: "4px 10px",
              margin: "2px",
              borderRadius: "16px",
              textTransform: "capitalize",
            }}
          >
            {cleanWord}
          </Typography>
        </Tooltip>
      );
    }
    return `${word} `;
  });
};

const PAGE_SIZE = 25;

const Factsheets = () => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [visibleRowCount, setVisibleRowCount] = useState(PAGE_SIZE);
  const [isInfoVisible, setIsInfoVisible] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 1200, once: true });
  }, []);

  const tripsitTheme = {
    pageBg: "#0c0c0d",
    primary: "#4a4de2",
    primaryHover: "#6c6ff1",
  };

  const {
    data: allDrugs = [],
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useQuery<Drug[]>({
    queryKey: ["all-drugs-data"],
    queryFn: async () => {
      const response = await fetch(
        "https://raw.githubusercontent.com/TripSit/drugs/main/drugs.json",
      );
      return Object.values((await response.json()) as { [key: string]: Drug });
    },
  });

  const visibleData = useMemo(
    () => allDrugs.slice(0, visibleRowCount),
    [allDrugs, visibleRowCount],
  );

  const columns = useMemo<MRT_ColumnDef<Drug>[]>(
    () => [
      {
        accessorKey: "pretty_name",
        header: "Name",
        filterVariant: "text",
        size: 180,
      },
      {
        accessorFn: (row) => row.aliases?.join(", "),
        id: "aliases",
        header: "Aliases",
        filterVariant: "text",
        size: 200,
      },
      {
        accessorFn: (row) => row.properties.categories?.sort().join(" "),
        id: "categories",
        header: "Categories",
        filterVariant: "text",
        enableGlobalFilter: false,
        size: 180,
        Cell: ({ cell }) => (
          <span>{addCategoryStyle(cell.getValue<string>())}</span>
        ),
      },
      {
        accessorFn: (row) => row.properties.summary,
        id: "summary",
        header: "Summary",
        filterVariant: "text",
        enableGlobalFilter: true,
        size: 900,
        Cell: ({ cell }) => (
          <span>{addDictionaryDefs(cell.getValue<string>())}</span>
        ),
      },
    ],
    [],
  );

  const table = useMaterialReactTable({
    columns,
    data: visibleData,
    enableStickyHeader: true,
    enableRowPinning: true,
    rowPinningDisplayMode: "top",
    enablePagination: false,
    rowCount: allDrugs.length,
    getRowId: (row) => row.name,
    initialState: { showColumnFilters: true },
    muiTablePaperProps: {
      sx: { backgroundColor: "transparent", boxShadow: "none" },
    },
    muiTopToolbarProps: {
      sx: {
        backgroundColor: "transparent",
        padding: 0,
        "& .MuiSvgIcon-root": {
          color: "white",
        },
      },
    },
    muiSearchTextFieldProps: {
      sx: {
        "& .MuiInputBase-root": {
          color: "white",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255, 255, 255, 0.5)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "white",
          },
        },
        "& .MuiInputLabel-root": {
          color: "rgba(255, 255, 255, 0.7)",
        },
      },
    },
    muiTableContainerProps: {
      ref: tableContainerRef,
      sx: { backgroundColor: "transparent", maxHeight: "80vh" },
      onScroll: (event) => {
        const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
        if (
          scrollHeight - scrollTop - clientHeight < 800 &&
          visibleRowCount < allDrugs.length
        ) {
          setVisibleRowCount((prev) =>
            Math.min(prev + PAGE_SIZE, allDrugs.length),
          );
        }
      },
    },
    muiToolbarAlertBannerProps: isError
      ? { color: "error", children: "Error loading data" }
      : undefined,
    muiTableProps: {
      sx: {
        borderCollapse: "separate",
        borderSpacing: "4px 2px",
        color: "white",
      },
    },
    muiTableHeadCellProps: {
      sx: {
        backgroundColor: "rgba(18, 18, 20, 0.7)", // Darker header
        border: "none",
        borderBottom: `1px solid ${tripsitTheme.primaryHover}`,
        padding: "16px",
        color: "white",
        textShadow: "0 0 5px rgba(0,0,0,0.8)",
      },
    },
    muiTableBodyRowProps: {
      sx: {
        position: "relative",
        transition: "transform 0.2s ease-out, box-shadow 0.2s ease-out",
        "&:hover": {
          transform: "translateY(-3px)",
          boxShadow: `0 6px 20px -5px ${tripsitTheme.primaryHover}`, // Refined shadow
          zIndex: 2,
        },
      },
    },
    muiTableBodyCellProps: {
      sx: {
        border: `2px solid ${tripsitTheme.primary}`,
        borderRadius: "8px",
        backgroundColor: "rgba(12, 12, 13, 0.7)", // Darker, less purple background
        transition: "border-color 0.2s ease",
        color: "white",
        textShadow: "0 0 5px rgba(0,0,0,0.8)",
        "&:hover": { borderColor: tripsitTheme.primaryHover },
      },
    },
    renderTopToolbarCustomActions: () => (
      <Box sx={{ width: "100%", py: "4px" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Tooltip arrow title="Refresh Data">
            <IconButton onClick={() => refetch()}>
              <RefreshIcon sx={{ color: "white" }} />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            sx={{
              color: "white",
              borderColor: "rgba(255, 255, 255, 0.5)",
              textTransform: "none",
              "&:hover": {
                borderColor: "white",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              },
            }}
            onClick={() => setIsInfoVisible(!isInfoVisible)}
            startIcon={<InfoIcon />}
          >
            Factsheet Info
          </Button>
        </Box>
        <Collapse in={isInfoVisible} timeout="auto" unmountOnExit>
          <FactsheetInfoPanel />
        </Collapse>
      </Box>
    ),
    renderDetailPanel: ({ row }) => <DrugInfoCard drugData={row.original} />,
    renderBottomToolbar: () => (
      <Box
        sx={{
          padding: "1rem",
          textAlign: "center",
          color: "rgba(255,255,255,0.7)",
          height: "40px",
        }}
      >
        {isFetching && !isLoading ? (
          <CircularProgress size={20} color="secondary" />
        ) : visibleRowCount < allDrugs.length ? (
          "Scroll down to load more"
        ) : (
          "End of results"
        )}
      </Box>
    ),
    state: {
      isLoading,
      showAlertBanner: isError,
      showProgressBars: isFetching && !isLoading,
    },
  });

  const scrollbarStyles = `
    ::-webkit-scrollbar {
      width: 10px;
      background-color: ${tripsitTheme.pageBg};
    }
    ::-webkit-scrollbar-thumb {
      background-color: ${tripsitTheme.primary};
      border-radius: 10px;
      border: 2px solid ${tripsitTheme.pageBg};
    }
    ::-webkit-scrollbar-thumb:hover {
      background-color: ${tripsitTheme.primaryHover};
    }
  `;

  return (
    <Box
      sx={{
        position: "relative",
        backgroundColor: tripsitTheme.pageBg,
        overflow: "hidden",
      }}
    >
      <style>{scrollbarStyles}</style>
      <AnimatedBg
        type="cobweb"
        color={tripsitTheme.primaryHover}
        bg={{ zIndex: 0, position: "absolute" }}
      />
      <Box sx={{ position: "relative", zIndex: 1, padding: "0 1rem" }}>
        <MaterialReactTable table={table} />
      </Box>
    </Box>
  );
};

const ExamplePage = () => (
  <div data-bs-theme="dark">
    <Header />
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <QueryClientProvider client={new QueryClient()}>
        <Factsheets />
      </QueryClientProvider>
    </LocalizationProvider>
    <Footer />
  </div>
);

export default ExamplePage;
