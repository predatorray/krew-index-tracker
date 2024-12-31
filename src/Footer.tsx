import {Box, Container, Divider, Link, Stack, Typography} from "@mui/material";
import React, {ReactNode} from "react";

function FooterLink({ children, href }: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href} target="_blank" underline="hover" rel="noopener">{children}</Link>
  );
}

export default function Footer() {
  return (
    <Container component="footer" sx={{
      mt: 8,
      fontSize: 12,
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
    }}>
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem />}
        spacing={2}
        sx={{
          my: 2,
          justifyContent: "center",
        }}
      >
        <Box><FooterLink href="https://github.com/predatorray/krew-index-tracker">HOME</FooterLink></Box>
        <Box><FooterLink href="https://github.com/predatorray/krew-index-tracker/issues/new">REPORT</FooterLink></Box>
        <Box><FooterLink href="https://github.com/predatorray/krew-index-tracker/blob/main/LICENSE">LICENSE</FooterLink></Box>
      </Stack>
      <Box>
        <Typography variant="body2" color="text.secondary" align="center" sx={{
          my: 1,
          fontSize: 10,
        }}>
          Hosted on <b>GitHub Pages</b> & Powered by <b>GitHub Actions</b>
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center" sx={{
          my: 1,
          fontSize: 10,
        }}>
          © 2024 under the terms of the <FooterLink href="https://github.com/predatorray/krew-index-tracker/blob/main/LICENSE">MIT license</FooterLink>.
        </Typography>
      </Box>
    </Container>
  )
}